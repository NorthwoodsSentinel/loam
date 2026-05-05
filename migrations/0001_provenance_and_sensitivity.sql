-- Loam migration 0001 — provenance + sensitivity tagging
--
-- Adds two columns to the conversations table that future security features
-- will read at egress time:
--
--   trust_level   how much we trust the content. ingested AI conversations
--                 should default to untrusted because old conversations may
--                 carry adversarial prompt-injection content from before
--                 anyone knew to defend against it. lares-substrate (your
--                 own memory + notes) defaults to trusted.
--
--   sensitivity   how careful we should be about who sees this content. four
--                 tiers: public, personal, memoir-class, secret. defaults
--                 lean conservative. memoir-class and secret get hardware-key
--                 gating in future security features; public flows free.
--
-- Why this is the first foundational substrate move:
--   every later security feature (egress redaction, per-AI scoped tokens,
--   anomaly detection, hardware-key gates on sensitive reads) reads these
--   columns to decide what to do. tag the substrate now so the rules can
--   be added without re-tagging.
--
-- Backwards compatibility:
--   existing rows get the safest defaults (untrusted + personal). the rest
--   of Loam continues to work without touching the new columns. enforcement
--   of trust/sensitivity in queries is OPT-IN until you've reviewed your
--   tagging.
--
-- Healthy soil knows where each grain came from.

-- Step 1. Add the columns with conservative defaults.
ALTER TABLE conversations ADD COLUMN trust_level TEXT NOT NULL DEFAULT 'untrusted';
ALTER TABLE conversations ADD COLUMN sensitivity TEXT NOT NULL DEFAULT 'personal';

-- Step 2. Indexes for filtering.
CREATE INDEX IF NOT EXISTS idx_conv_trust       ON conversations(trust_level);
CREATE INDEX IF NOT EXISTS idx_conv_sensitivity ON conversations(sensitivity);

-- Step 3. Promote your own lares-substrate to trusted by default. (Optional;
-- only run if your `source` column uses the lares-* convention from the
-- examples in ingest/files.ts. Comment out or adjust if your source tags
-- differ.)
--
-- UPDATE conversations SET trust_level = 'trusted'
--   WHERE source LIKE 'lares-%';

-- Step 4. Promote your own self-authored notes to memoir-class if you mark
-- them with a known prefix. (Example only; adjust to your tagging
-- convention.)
--
-- UPDATE conversations SET sensitivity = 'memoir-class'
--   WHERE source = 'lares-memory' AND title LIKE 'user_%';

-- Notes on values:
--
--   trust_level values:
--     untrusted  - third-party AI conversations, public web content,
--                  anything you didn't write personally. treat as a
--                  potential carrier of prompt-injection content.
--     mixed      - you partially authored it but the model also contributed.
--                  most claude.ai and chatgpt history fits here once you've
--                  stopped worrying about adversarial injection.
--     trusted    - your own writing. lares-substrate, your notes, your
--                  TELOS, your handwritten knowledge.
--
--   sensitivity values:
--     public        - things you've already published or would happily
--                     publish. blog drafts, public essays, marketing copy.
--     personal      - work and life details that aren't public but aren't
--                     emergency-grade. most of your daily corpus.
--     memoir-class  - things that hold weight beyond their content. the
--                     memories that organize your thinking. losses,
--                     integrations, foundational moments. release with
--                     human-in-loop awareness.
--     secret        - credentials, financial, medical, content you would
--                     not want any model to see at any time. ideally
--                     never enters Loam at all; if it does, never released
--                     to providers.

-- Apply: wrangler d1 execute loam --remote --file=migrations/0001_provenance_and_sensitivity.sql
