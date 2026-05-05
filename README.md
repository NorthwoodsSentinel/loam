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

Most AI tools forget you between conversations. ChatGPT memory is intra-platform. Claude Projects don't reach across providers. Daniel Miessler's PAi framework articulates the shape but doesn't ship the substrate. And every memory product so far asks you to upload your data into *their* cloud.

Loam is different. **Bring your own Cloudflare.** Your data, your D1, your R2, your search. Nothing lives on infrastructure you don't own.

The product is the substrate underneath. Whatever AI you talk to — Claude, ChatGPT, Cursor, your custom agent — Loam can be the layer that gives them memory of who you are, what you've thought, and what you care about.

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
git clone https://github.com/<your-fork>/loam.git
cd loam
npm install

# Authenticate
wrangler login

# Create the resources on YOUR account
wrangler d1 create loam              # save the database_id from output
wrangler r2 bucket create loam

# Copy the template config and fill in YOUR database_id
cp wrangler.jsonc.template wrangler.jsonc
# Edit wrangler.jsonc — replace YOUR_D1_DATABASE_ID

# Apply the schema
wrangler d1 execute loam --remote --file=schema.sql

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

### ChatGPT, Gemini, Perplexity

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

**Built by [Robert Chuvala](https://github.com/robertchuvala) and the fleet.**

*Memory ages. Loam ripens.*
