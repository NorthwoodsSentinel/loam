#!/usr/bin/env bun
/*
 * Loam. ChatGPT export ingestion.
 *
 * chatgpt.com > Settings > Data Controls > Export data > email link > zip.
 * Inside that zip: conversations.json. Inside that: every conversation
 * you've ever had with ChatGPT, structured as a tree of messages.
 *
 * ChatGPT's format differs from Claude's. Each conversation has a `mapping`
 * field — a tree where each node has parent/children pointers. We walk the
 * tree from the root to flatten it into a linear thread following the
 * current_node pointer back to the root via parents, then reverse.
 *
 * System messages and tool calls are kept; the substrate doesn't decide
 * what's relevant for you.
 *
 * Idempotent. Re-running on the same export is safe.
 *
 * Usage: bun ingest/chatgpt.ts <conversations.json path> [raw_path-tag]
 * Env required: CLOUDFLARE_API_TOKEN, LOAM_ACCOUNT_ID, LOAM_DB_ID.
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

const [, , inputPath, rawPath = "chatgpt-export.zip"] = process.argv;
if (!inputPath) {
  console.error("usage: bun ingest/chatgpt.ts <conversations.json> [raw_path-tag]");
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

const SOURCE = "chatgpt";
const ROW_LIMIT = 750_000;

// ChatGPT timestamps are unix epoch seconds (float). Convert to ISO 8601.
const toIso = (epoch: number | null | undefined): string | null =>
  epoch ? new Date(epoch * 1000).toISOString() : null;

// Walk a ChatGPT conversation's mapping from current_node back to root via parents,
// then reverse to get the linear thread (the "active" path the user actually saw).
function flattenConversation(conv: any): { id: string; role: string; content: string; created_at: string }[] {
  const mapping = conv.mapping || {};
  const order: string[] = [];
  let cursor = conv.current_node;
  while (cursor) {
    order.unshift(cursor);
    cursor = mapping[cursor]?.parent;
  }
  const out: { id: string; role: string; content: string; created_at: string }[] = [];
  for (const id of order) {
    const node = mapping[id];
    const m = node?.message;
    if (!m) continue;
    let content = "";
    const c = m.content;
    if (c?.content_type === "text" && Array.isArray(c.parts)) {
      content = c.parts.filter((p: any) => typeof p === "string").join("\n");
    } else if (c?.content_type === "code" && typeof c.text === "string") {
      content = c.text;
    } else if (c?.content_type === "multimodal_text" && Array.isArray(c.parts)) {
      content = c.parts
        .filter((p: any) => typeof p === "string")
        .join("\n");
    } else if (typeof c === "string") {
      content = c;
    }
    if (!content.trim()) continue;
    const role = m.author?.role || "unknown";
    const created_at = toIso(m.create_time) || conv.create_time ? toIso(conv.create_time)! : new Date().toISOString();
    out.push({ id: m.id || id, role, content, created_at });
  }
  return out;
}

console.log(`reading ${inputPath}…`);
const conversations: any[] = JSON.parse(readFileSync(inputPath, "utf8"));
console.log(`parsed ${conversations.length} conversations`);

const existingIds = new Set<string>();
const existing = await exec("SELECT id FROM conversations WHERE source = ?", [SOURCE]);
for (const r of existing) existingIds.add(r.id);
console.log(`already in Loam: ${existingIds.size} conversations`);

const missing = conversations.filter((c) => !existingIds.has(c.conversation_id || c.id));
console.log(`to ingest: ${missing.length} conversations`);

let convInserted = 0;
let msgInserted = 0;
let msgSkippedTooBig = 0;

for (const conv of missing) {
  const convId = conv.conversation_id || conv.id;
  if (!convId) continue;
  const messages = flattenConversation(conv);
  const created_at = toIso(conv.create_time) || messages[0]?.created_at || new Date().toISOString();
  const updated_at = toIso(conv.update_time) || created_at;

  await exec(
    "INSERT OR REPLACE INTO conversations (id, source, title, created_at, updated_at, message_count, raw_path) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [convId, SOURCE, conv.title ?? "", created_at, updated_at, messages.length, rawPath]
  );
  convInserted++;

  for (let pos = 0; pos < messages.length; pos++) {
    const m = messages[pos];
    if (m.content.length > ROW_LIMIT) {
      console.warn(`  skip oversized msg ${m.id} (${m.content.length} chars) in conv ${convId}`);
      msgSkippedTooBig++;
      continue;
    }
    await exec(
      "INSERT OR REPLACE INTO messages (id, conversation_id, role, content, created_at, position) VALUES (?, ?, ?, ?, ?, ?)",
      [m.id, convId, m.role, m.content, m.created_at, pos]
    );
    await exec(
      "INSERT INTO messages_fts (content, conversation_id, message_id, source, role, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [m.content, convId, m.id, SOURCE, m.role, m.created_at]
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
  [SOURCE, rawPath, convInserted, msgInserted, `ChatGPT export ingest. Skipped: ${msgSkippedTooBig}.`]
);
console.log("ledger row inserted");
