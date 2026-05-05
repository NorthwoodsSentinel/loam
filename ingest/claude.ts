#!/usr/bin/env bun
/*
 * Loam. Claude.ai export ingestion.
 *
 * claude.ai > Settings > Account > Privacy > Export data > email link > zip.
 * Inside that zip: conversations.json. Inside that: every conversation
 * you've had with Claude on the web.
 *
 * This script reads the export, normalizes the schema, writes it into
 * your Loam. Parameterized D1 calls so arbitrary content (newlines,
 * quotes, long blobs, your raw thinking) lands cleanly. Idempotent:
 * re-running on the same export is safe.
 *
 * The history was always yours. This just gives you a place to keep it.
 *
 * Usage: bun ingest/claude.ts <conversations.json path> [raw_path-tag]
 * Env required:
 *   CLOUDFLARE_API_TOKEN   your CF API token (D1 read+write scope)
 *   LOAM_ACCOUNT_ID        your CF account ID
 *   LOAM_DB_ID             your loam D1 database UUID
 */

import { readFileSync } from "fs";

const ACCOUNT_ID = process.env.LOAM_ACCOUNT_ID;
const DB_ID = process.env.LOAM_DB_ID;
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
if (!ACCOUNT_ID || !DB_ID || !TOKEN) {
  console.error("required env: LOAM_ACCOUNT_ID, LOAM_DB_ID, CLOUDFLARE_API_TOKEN");
  process.exit(1);
}
const API = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DB_ID}/query`;

const [, , inputPath, rawPath = "claude-export.zip"] = process.argv;
if (!inputPath) {
  console.error("usage: bun ingest/claude.ts <conversations.json> [raw_path-tag]");
  process.exit(1);
}

async function exec(sql: string, params: any[] = []): Promise<any> {
  const res = await fetch(API, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ sql, params }),
  });
  const j = (await res.json()) as any;
  if (!j.success) {
    throw new Error(`D1 error: ${JSON.stringify(j.errors)} | sql=${sql.slice(0, 100)}…`);
  }
  return j.result?.[0]?.results ?? [];
}

const SOURCE = "claude";
const ROW_LIMIT = 750_000; // SQLite per-row safety margin

console.log(`reading ${inputPath}…`);
const conversations: any[] = JSON.parse(readFileSync(inputPath, "utf8"));
console.log(`parsed ${conversations.length} conversations`);

const existingIds = new Set<string>();
const existing = await exec("SELECT id FROM conversations WHERE source = ?", [SOURCE]);
for (const r of existing) existingIds.add(r.id);
console.log(`already in Loam: ${existingIds.size} conversations`);

const missing = conversations.filter((c) => !existingIds.has(c.uuid));
console.log(`to ingest: ${missing.length} conversations`);

let convInserted = 0;
let msgInserted = 0;
let msgSkippedTooBig = 0;

for (const conv of missing) {
  const msgs = (conv.chat_messages ?? []) as any[];

  await exec(
    "INSERT OR REPLACE INTO conversations (id, source, title, created_at, updated_at, message_count, raw_path) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [conv.uuid, SOURCE, conv.name ?? "", conv.created_at, conv.updated_at ?? conv.created_at, msgs.length, rawPath]
  );
  convInserted++;

  for (let pos = 0; pos < msgs.length; pos++) {
    const m = msgs[pos];
    let content = m.text ?? "";
    if (!content && Array.isArray(m.content)) {
      content = m.content
        .filter((b: any) => b?.type === "text" && b.text)
        .map((b: any) => b.text)
        .join("\n");
    }
    if (!content) continue;
    if (content.length > ROW_LIMIT) {
      console.warn(`  skip oversized msg ${m.uuid} (${content.length} chars) in conv ${conv.uuid}`);
      msgSkippedTooBig++;
      continue;
    }
    const role = m.sender;
    await exec(
      "INSERT OR REPLACE INTO messages (id, conversation_id, role, content, created_at, position) VALUES (?, ?, ?, ?, ?, ?)",
      [m.uuid, conv.uuid, role, content, m.created_at, pos]
    );
    await exec(
      "INSERT INTO messages_fts (content, conversation_id, message_id, source, role, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [content, conv.uuid, m.uuid, SOURCE, role, m.created_at]
    );
    msgInserted++;
  }
  if (convInserted % 5 === 0) {
    console.log(`  ${convInserted}/${missing.length} convs done, ${msgInserted} msgs ingested`);
  }
}

console.log(`\ndone: ${convInserted} conversations, ${msgInserted} messages, ${msgSkippedTooBig} skipped oversized`);

await exec(
  "INSERT INTO ingestions (source, archive_path, conversations, messages, notes) VALUES (?, ?, ?, ?, ?)",
  [SOURCE, rawPath, convInserted, msgInserted, `Claude export ingest. Skipped: ${msgSkippedTooBig}.`]
);
console.log("ledger row inserted");
