-- Loam. D1 schema.
--
-- Three tables and one virtual layer:
--   conversations       what counts as a unit of thinking
--   messages            the texture inside the unit
--   messages_fts        the search layer that finds what you forgot you knew
--   ingestions          a ledger of what was buried, when, from where
--
-- Healthy soil is mixed. Sources: claude, chatgpt, gemini, perplexity, your
-- own notes and journals, anything you bring. The schema doesn't care which.
-- It cares that the message_id is unique and the position is honest.
--
-- "Memory ages. Loam ripens."

CREATE TABLE IF NOT EXISTS conversations (
  id              TEXT PRIMARY KEY,
  source          TEXT NOT NULL,
  title           TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT,
  message_count   INTEGER DEFAULT 0,
  raw_path        TEXT,
  imported_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_conv_source       ON conversations(source);
CREATE INDEX IF NOT EXISTS idx_conv_created      ON conversations(created_at);
CREATE INDEX IF NOT EXISTS idx_conv_source_dt    ON conversations(source, created_at);

CREATE TABLE IF NOT EXISTS messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role            TEXT NOT NULL,
  content         TEXT NOT NULL,
  created_at      TEXT NOT NULL,
  position        INTEGER NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

CREATE INDEX IF NOT EXISTS idx_msg_conv_pos      ON messages(conversation_id, position);
CREATE INDEX IF NOT EXISTS idx_msg_created       ON messages(created_at);

-- FTS5 contentless table for full-text search across messages
CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
  content,
  conversation_id UNINDEXED,
  message_id UNINDEXED,
  source UNINDEXED,
  role UNINDEXED,
  created_at UNINDEXED,
  tokenize='porter unicode61'
);

-- Lightweight ingestion ledger
CREATE TABLE IF NOT EXISTS ingestions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  source          TEXT NOT NULL,
  archive_path    TEXT NOT NULL,
  conversations   INTEGER NOT NULL,
  messages        INTEGER NOT NULL,
  ingested_at     TEXT NOT NULL DEFAULT (datetime('now')),
  notes           TEXT
);
