# Loam

**The memory substrate for personal AI.**

Bring your AI conversation history. It stays sovereign — on your own Cloudflare account. Search it like your own brain. The soil layer underneath whatever AI you build, querying, or thinking on top.

```
loam, n.
  the fertile soil layer underneath what grows.
  mixed of multiple sources. holds what matters. quiet, not flashy.
  in mountain biking: the soil you actually want to ride.
  here: your AI history, your knowledge base, your continuity — searchable, on your land.
```

---

## Why this exists

You probably use more than one AI tool. Maybe you started with ChatGPT and added Claude. Maybe you've moved between Gemini and Perplexity. Maybe you're deep in Claude Code, Cursor, or a custom agent built on Fabric. Maybe you're building toward a PAi in Daniel Miessler's shape. Each tool keeps a fragment of your history. None keep all of it.

(Loam ingests from any tool that lets you export your data. ChatGPT, Claude, Gemini, and Perplexity all have export pipelines today. Tools that don't have exports yet — that's a problem with the tool, not with Loam.)

And as you grow — mature out of one tool, move to another, run several at once — your context fragments further. The thinking you did six months ago in ChatGPT is invisible to the agent you're working with today. Every conversation starts from zero.

**Loam is the layer underneath that holds it all.** Your AI conversation history from every platform you've used. Your notes, journal, knowledge base. Searchable from one interface, queryable from any AI tool you bring to it.

### The data lives on YOUR Cloudflare account

There are no Loam servers holding your data. **The Loam authors never see what you upload.** Your D1 database, your R2 storage, your bearer token, your account. We give you the code; you run it on your infrastructure.

If Cloudflare or this project disappears tomorrow, your data is still yours, your Worker is still your Worker, your search still works. Sovereignty isn't a feature here — it's the architecture.

### Why this matters for Claude Code, Cursor, and any AI tool you use

- **Claude Code:** *"what did we figure out last week about X?"* — Loam can answer from your actual history instead of guessing from short context
- **Cursor / coding agents:** project context that lives outside the codebase, queryable from inside it
- **Fabric / custom agents:** values, themes, prior conversations — pull substrate-shaped context into any pattern
- **Whatever comes next:** the per-user MCP server endpoint (on the roadmap) makes this plug-and-play — any MCP-aware client can read your Loam directly

## What Loam does today

- **Ingest your AI history** from Claude.ai exports (more sources coming: ChatGPT, Gemini, Perplexity)
- **Ingest any markdown/text directory** as a custom source — your notes, journal, knowledge base
- **Multi-source full-text search** with FTS5 stemming + BM25 ranking
- **Sub-100ms queries** at corpus sizes of thousands of conversations
- **Clean web UI** with date filters, source filters, conversation drill-down
- **Bearer-token auth**, private by default
- **Bring Your Own Cloudflare** — Worker + D1 + R2, all on your account

## What's coming

- Semantic search via Cloudflare Vectorize
- Proactive surfacing — system brings you relevant past content unprompted, based on what you're currently thinking about
- Counter-thesis surfacing — *"things you've said that contradict what you're saying now"* (first-class feature, not afterthought)
- MCP server endpoint per deployment — your other AI tools query your Loam directly
- More import sources

## Why Cloudflare

- Workers run at the edge, fast and cheap
- D1 (SQLite at the edge) is enough for any individual's lifetime corpus
- R2 stores raw archives without egress fees
- Vectorize sits next to D1 when semantic search lands
- One platform, one bill, your account

## Deploy

You'll need:
- A Cloudflare account (free tier works for getting started)
- The `wrangler` CLI installed (`npm install -g wrangler`)
- 5 minutes

```bash
git clone https://github.com/NorthwoodsSentinel/loam.git
cd loam
npm install

# Authenticate. Either:
#   wrangler login                                      (browser flow on a desktop)
# OR:
#   export CLOUDFLARE_API_TOKEN=...                     (token from dash.cloudflare.com/profile/api-tokens; for headless / server / container)
wrangler login

# Create the resources on YOUR account
wrangler d1 create loam              # save the database_id from output
wrangler r2 bucket create loam

# Copy the template config and fill in YOUR database_id
cp wrangler.jsonc.template wrangler.jsonc
# Edit wrangler.jsonc — replace YOUR_D1_DATABASE_ID

# Apply the schema (fresh deploys)
wrangler d1 execute loam --remote --file=schema.sql

# OR, if you deployed before 2026-05-05, apply the provenance migration:
# wrangler d1 execute loam --remote --file=migrations/0001_provenance_and_sensitivity.sql

# Set the bearer token (generate any random string; this gates your search)
openssl rand -hex 32 | wrangler secret put AUTH_TOKEN

# Deploy
wrangler deploy
```

You now have Loam at `https://loam.<your-subdomain>.workers.dev`.

## Ingest your history

### Claude.ai

1. Go to [claude.ai](https://claude.ai) → **Settings** → **Account** → **Privacy** → **Export data**
2. You'll receive an email with a download link (within a few minutes to hours)
3. Download the zip and extract it. You'll find `conversations.json`.
4. Set environment variables:
   ```bash
   export CLOUDFLARE_API_TOKEN="<your-CF-API-token-with-D1-read-write>"
   export LOAM_ACCOUNT_ID="<your-CF-account-id>"
   export LOAM_DB_ID="<the-D1-database-id-from-earlier>"
   ```
5. Run the ingest:
   ```bash
   bun ingest/claude.ts /path/to/conversations.json
   ```

### Any markdown directory (notes, journal, knowledge base)

```bash
bun ingest/files.ts mynotes /path/to/your/notes
```

The `mynotes` argument becomes the source tag — searches can filter by it.

### ChatGPT

```bash
# At chatgpt.com → Settings → Data Controls → Export data → email link → zip
# Inside the zip: conversations.json
bun ingest/chatgpt.ts /path/to/conversations.json
```

### Gemini (Google Takeout)

```bash
# At takeout.google.com → Bard/Gemini → Export
# Inside the zip: Takeout/Bard/MyActivity.json
bun ingest/gemini.ts /path/to/MyActivity.json
```

### Perplexity

Coming soon. Same pattern: export from the platform, run an ingest script, content lands in Loam under that source tag. Open issues / PRs welcome.

## Use it

Open `https://loam.<your-subdomain>.workers.dev/?token=<your-AUTH_TOKEN>` once on each device. The token is stored in localStorage; subsequent visits use the bare URL.

Search anything you've said or had said to you across all your sources. Click any result to read the full conversation.

## Security posture

- All data lives on YOUR Cloudflare account. The Loam authors never see it.
- Bearer-token auth gates the data API. Public UI loads but search/stats/conversations require the token.
- Token is stored in browser localStorage on each device you use.
- The Worker code is open source; audit it yourself before deploying.
- For sensitive content: use a strong AUTH_TOKEN (`openssl rand -hex 32` is good), don't embed the token in shared URLs, and rotate the token periodically (`wrangler secret put AUTH_TOKEN` again with a new value).

## Architecture

```
your AI exports
       │
       ▼
   ingest scripts (run locally)
       │
       │ parameterized D1 REST API
       ▼
┌─────────────────────────┐
│  YOUR Cloudflare        │
│                         │
│  Worker (loam)          │
│  ├── search API         │
│  ├── conversation API   │
│  ├── stats API          │
│  └── HTML UI            │
│                         │
│  D1 (loam)              │
│  ├── conversations      │
│  ├── messages           │
│  └── messages_fts (FTS5)│
│                         │
│  R2 (loam)              │
│  └── raw archives       │
└─────────────────────────┘
```

## Project status

Loam is early. The architecture is solid (running on real personal corpora at thousands of entries with sub-100ms search), but the public release is days old. Expect rough edges. Open issues, PRs, and feedback welcomed.

## License

MIT. See [LICENSE](LICENSE).

---

**Built by [Robert Chuvala](https://northwoodssentinel.com) at [Northwoods Sentinel](https://northwoodssentinel.com) and the fleet.**

*Memory ages. Loam ripens.*
