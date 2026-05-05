#!/usr/bin/env bun
/*
 * Loam. Markdown directory ingestion.
 *
 * Point this at any folder of .md or .txt notes (journal, knowledge base,
 * fleet memory, capture inbox) and the contents become a searchable source
 * in your Loam alongside your AI history. Each file becomes one searchable
 * unit. Frontmatter title is honored if present, otherwise the filename.
 *
 * Mix your AI conversations and your handwritten thinking in the same loam.
 * They belong together. The substrate doesn't care which voice it carries.
 *
 * Idempotent. The ID is a SHA-1 of the file path, so re-running on the same
 * directory is safe and updates content in place.
 *
 * Usage: bun ingest/files.ts <source-tag> <root-dir> [--exclude=name1,name2]
 * Env required: CLOUDFLARE_API_TOKEN, LOAM_ACCOUNT_ID, LOAM_DB_ID.
 *
 * Examples:
 *   bun ingest/files.ts notes ./my-notes
 *   bun ingest/files.ts journal ./journal --exclude=draft.md,private.md
 */

import { readFileSync, statSync, readdirSync } from "fs";
import { join, basename, relative } from "path";
import { createHash } from "crypto";

const ACCOUNT_ID = process.env.LOAM_ACCOUNT_ID;
const DB_ID = process.env.LOAM_DB_ID;
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
if (!ACCOUNT_ID || !DB_ID || !TOKEN) {
  console.error("required env: LOAM_ACCOUNT_ID, LOAM_DB_ID, CLOUDFLARE_API_TOKEN");
  process.exit(1);
}
const API = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DB_ID}/query`;

const args = process.argv.slice(2);
const source = args[0];
const root = args[1];
const exclude = (args.find((a) => a.startsWith("--exclude="))?.split("=")[1] ?? "")
  .split(",")
  .filter(Boolean);

if (!source || !root) {
  console.error("usage: bun ingest/files.ts <source-tag> <root-dir> [--exclude=name1,name2]");
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

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith(".")) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) out.push(...walk(full));
    else if (full.endsWith(".md") || full.endsWith(".txt")) out.push(full);
  }
  return out;
}

function extractFrontmatterTitle(content: string): string | null {
  const fm = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) return null;
  const nameLine = fm[1].split("\n").find((l) => l.startsWith("name:") || l.startsWith("title:"));
  if (!nameLine) return null;
  return nameLine.replace(/^(name|title):\s*/, "").trim();
}

const ROW_LIMIT = 750_000;

const files = walk(root).filter(
  (f) => !exclude.some((ex) => basename(f) === ex || f.includes(ex))
);

console.log(`scanning ${root}…`);
console.log(`found ${files.length} files (after exclusions: ${exclude.join(", ") || "none"})`);

let inserted = 0;
let skipped = 0;
let errored = 0;

for (const filepath of files) {
  try {
    const stat = statSync(filepath);
    const content = readFileSync(filepath, "utf8");
    if (!content.trim()) {
      skipped++;
      continue;
    }
    if (content.length > ROW_LIMIT) {
      console.warn(`  skip oversized ${filepath} (${content.length} chars)`);
      skipped++;
      continue;
    }

    const id = createHash("sha1").update(filepath).digest("hex").slice(0, 36);
    const formattedId = `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20, 32)}`;
    const title = extractFrontmatterTitle(content) ?? basename(filepath, ".md").replace(/\.txt$/, "");
    const mtime = new Date(stat.mtimeMs).toISOString();
    const relPath = relative(process.env.HOME ?? process.cwd(), filepath);

    await exec(
      "INSERT OR REPLACE INTO conversations (id, source, title, created_at, updated_at, message_count, raw_path) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [formattedId, source, title, mtime, mtime, 1, relPath]
    );

    const msgId = `msg-${formattedId}`;
    await exec(
      "INSERT OR REPLACE INTO messages (id, conversation_id, role, content, created_at, position) VALUES (?, ?, ?, ?, ?, ?)",
      [msgId, formattedId, "document", content, mtime, 0]
    );
    await exec("DELETE FROM messages_fts WHERE message_id = ?", [msgId]);
    await exec(
      "INSERT INTO messages_fts (content, conversation_id, message_id, source, role, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [content, formattedId, msgId, source, "document", mtime]
    );
    inserted++;
    if (inserted % 25 === 0) console.log(`  ${inserted} files ingested…`);
  } catch (e: any) {
    console.error(`  ERROR on ${filepath}: ${e.message?.slice(0, 120)}`);
    errored++;
  }
}

console.log(`\ndone — inserted: ${inserted}, skipped: ${skipped}, errors: ${errored}`);

await exec(
  "INSERT INTO ingestions (source, archive_path, conversations, messages, notes) VALUES (?, ?, ?, ?, ?)",
  [source, root, inserted, inserted, `File ingest from ${root}. Skipped: ${skipped}, errors: ${errored}.`]
);
console.log("ledger row inserted");
