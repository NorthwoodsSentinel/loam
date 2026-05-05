#!/usr/bin/env bun
/*
 * Loam. Gemini (Google Takeout) ingestion.
 *
 * Google Takeout > Bard / Gemini > Export.
 * The export comes as a zip; inside, look for `Takeout/Bard/MyActivity.json`
 * or `Takeout/Bard/MyActivity.html`. JSON is preferred. If only HTML is
 * available, run a tool like `pup` or write a small parser first; this
 * adapter expects JSON.
 *
 * The JSON format is one entry per Gemini interaction (a single prompt +
 * response pair). Conversations aren't structured by Google as multi-turn
 * threads in the export; each entry is a discrete event. We treat each
 * entry as a one-message-pair "conversation" in Loam.
 *
 * Idempotent. The conversation id is a SHA-1 of the entry's timestamp +
 * first 200 chars of the prompt, so re-runs on the same export are safe.
 *
 * Usage: bun ingest/gemini.ts <MyActivity.json path> [raw_path-tag]
 * Env required: CLOUDFLARE_API_TOKEN, LOAM_ACCOUNT_ID, LOAM_DB_ID.
 */

import { readFileSync } from "fs";
import { createHash } from "crypto";

const ACCOUNT_ID = process.env.LOAM_ACCOUNT_ID;
const DB_ID = process.env.LOAM_DB_ID;
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
if (!ACCOUNT_ID || !DB_ID || !TOKEN) {
  console.error("required env: LOAM_ACCOUNT_ID, LOAM_DB_ID, CLOUDFLARE_API_TOKEN");
  process.exit(1);
}
const API = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DB_ID}/query`;

const [, , inputPath, rawPath = "gemini-takeout.zip"] = process.argv;
if (!inputPath) {
  console.error("usage: bun ingest/gemini.ts <MyActivity.json> [raw_path-tag]");
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

const SOURCE = "gemini";
const ROW_LIMIT = 750_000;

function makeId(time: string, prompt: string): string {
  const h = createHash("sha1").update(`${time}\n${prompt.slice(0, 200)}`).digest("hex").slice(0, 32);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

console.log(`reading ${inputPath}…`);
const entries: any[] = JSON.parse(readFileSync(inputPath, "utf8"));
console.log(`parsed ${entries.length} entries`);

const existingIds = new Set<string>();
const existing = await exec("SELECT id FROM conversations WHERE source = ?", [SOURCE]);
for (const r of existing) existingIds.add(r.id);
console.log(`already in Loam: ${existingIds.size} entries`);

let convInserted = 0;
let msgInserted = 0;
let skipped = 0;

for (const entry of entries) {
  // Google Takeout MyActivity entry shape:
  //   title (often "Asked Bard..." or "Asked Gemini...")
  //   titleUrl (link to the chat)
  //   subtitles[].name (the prompt text variants)
  //   time (ISO timestamp)
  //   details, products, locations
  //   description (sometimes the response, sometimes prompt continuation)

  const time = entry.time;
  if (!time) { skipped++; continue; }

  // Heuristic extraction: Gemini Takeout entries have inconsistent shapes
  // depending on when the export was generated. This handles the common cases.
  const prompt: string =
    entry.subtitles?.[0]?.name ??
    entry.title?.replace(/^Asked (Bard|Gemini): /, "") ??
    entry.title ??
    "";
  const response: string = entry.description ?? "";

  if (!prompt.trim() && !response.trim()) { skipped++; continue; }

  const convId = makeId(time, prompt);
  if (existingIds.has(convId)) continue;

  const title = prompt.slice(0, 100).replace(/\n/g, " ");

  await exec(
    "INSERT OR REPLACE INTO conversations (id, source, title, created_at, updated_at, message_count, raw_path) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [convId, SOURCE, title, time, time, response ? 2 : 1, rawPath]
  );
  convInserted++;

  // Two messages per entry: the prompt and the response (when present)
  let pos = 0;
  for (const [role, content] of [["human", prompt], ["assistant", response]] as const) {
    if (!content?.trim()) continue;
    if (content.length > ROW_LIMIT) { skipped++; continue; }
    const msgId = `${convId}-${pos}`;
    await exec(
      "INSERT OR REPLACE INTO messages (id, conversation_id, role, content, created_at, position) VALUES (?, ?, ?, ?, ?, ?)",
      [msgId, convId, role, content, time, pos]
    );
    await exec(
      "INSERT INTO messages_fts (content, conversation_id, message_id, source, role, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [content, convId, msgId, SOURCE, role, time]
    );
    msgInserted++;
    pos++;
  }

  if (convInserted % 50 === 0) {
    console.log(`  ${convInserted} entries done, ${msgInserted} messages ingested`);
  }
}

console.log(`\ndone: ${convInserted} entries, ${msgInserted} messages, ${skipped} skipped`);

await exec(
  "INSERT INTO ingestions (source, archive_path, conversations, messages, notes) VALUES (?, ?, ?, ?, ?)",
  [SOURCE, rawPath, convInserted, msgInserted, `Gemini Takeout ingest. Skipped: ${skipped}.`]
);
console.log("ledger row inserted");
