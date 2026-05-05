# Launch post drafts

Draft copy for the public launch. Rob reviews + ships.

---

## Discord post (Daniel Miessler's community — Unsupervised Learning / Fabric)

**Channel:** `#projects` or `#show-and-tell` or whichever fits the community structure.

---

> **Loam — the memory substrate for personal AI.** I built this for myself; the convergence with Daniel's PAi work was so clean I figured the audience here would want it.
>
> The premise: most AI memory products ask you to upload your data to *their* cloud. Loam runs on YOUR Cloudflare account. D1 + R2 + Worker, FTS5 search, BYOK. Bring your AI history (Claude.ai exports working today; ChatGPT/Gemini coming) plus any markdown directory of your notes/journal. Search across all of it sub-100ms.
>
> The goal isn't another memory tool. It's the substrate underneath whatever PAi you build — Fabric workflows, your custom agent, Claude Code, Claude Desktop with MCP. Memory layer that's actually yours. The Loam authors never see your data.
>
> Open source, MIT licensed. Deploy in ~5 minutes if you've got a Cloudflare account.
>
> Repo + deploy guide: `https://github.com/NorthwoodsSentinel/loam`
>
> Roadmap: Vectorize semantic search, proactive surfacing based on your values/themes, counter-thesis surfacing (*"things you've said that contradict your current thinking"* as a first-class feature), per-user MCP server endpoint so any AI you talk to can query your Loam directly.
>
> Feedback welcome. Especially want to hear from people building Fabric workflows or running Claude Code seriously — the MCP layer is designed to plug under both.
>
> *— Robert*

---

## X / Twitter (single post or unnumbered short-thread)

**Length:** keep tight. No "1/ 2/ 3/" numbering — just flowing prose. Either one long post or a few separate tweets posted as a thread without enumeration.

---

### Single-post version

> **Loam** — the memory substrate for personal AI.
>
> Most AI tools forget you between sessions. ChatGPT memory stays inside ChatGPT. Claude Projects don't cross providers. Every memory product asks you to upload your data into *their* cloud.
>
> Loam runs on YOUR Cloudflare account. D1 + R2 + Worker. FTS5 search across your full AI history plus any notes you keep. Bring Your Own Cloudflare. The Loam authors never see your data.
>
> Built in homage to @DanielMiessler's PAi thinking and Fabric. Loam isn't a competing PAi — it's the memory layer underneath any PAi implementation (or Claude Code, or Cursor, or your custom agent).
>
> Roadmap: semantic search, values-based proactive surfacing, counter-thesis surfacing, per-user MCP endpoint.
>
> MIT licensed. Deploy in 5 minutes:
> github.com/NorthwoodsSentinel/loam
>
> *Memory ages. Loam ripens.*

---

### Threaded version (separate tweets, no numbering)

> Built **Loam** — the memory substrate for personal AI. Bring Your Own Cloudflare. Your data stays sovereign. Open source, MIT.

> The premise: every AI memory product so far asks you to upload your data into *their* cloud. ChatGPT memory is intra-platform. Claude Projects don't reach across providers. Mem.ai and Reflect host your second brain themselves.

> Loam runs on YOUR Cloudflare account. D1 + R2 + Worker. FTS5 search. Bearer-token auth. The Loam authors never see your data.

> Today: ingest Claude.ai exports plus any markdown directory. Sub-100ms search across all your sources, with date and source filters, snippet highlighting, conversation drill-down.

> Coming: ChatGPT/Gemini ingestion. Vectorize semantic search. Proactive surfacing based on your values and themes — system brings relevant past content unprompted, not just on query.

> The feature I haven't seen anywhere: **counter-thesis surfacing.** *"Things you've said in the past that contradict your current thinking."* First-class feature, not afterthought. Most memory tools are confirmation engines. This one will challenge you.

> The deeper play: per-user MCP server endpoint. Whatever AI you talk to — Claude Code, Cursor, your custom agent — queries YOUR Loam for context. The substrate underneath your PAi implementation.

> Built in homage to @DanielMiessler's PAi thinking and Fabric. Loam isn't a competing PAi — it's the memory layer underneath any PAi implementation.

> MIT. Deploy in 5 minutes if you've got a Cloudflare account: github.com/NorthwoodsSentinel/loam

> *Memory ages. Loam ripens.*

---

## Newsletter / blog post (longer, more reflective)

Save for later. NWS-shape post arguing the sovereignty thesis with Loam as the working artifact. Don't ship tonight; let the Discord/X go first, see what lands, write the longer piece in response to feedback.

---

## Direct outreach to Daniel (DON'T SEND PRE-LAUNCH)

If Loam gets traction, Rob may want to send a direct note to Daniel introducing it. **Don't pre-launch this.** Let the work circulate organically first; if Daniel picks it up, the follow-up DM has weight. If he doesn't, Rob can decide whether to reach out cold based on what happened.

When ready, the message is short:
> Daniel — built Loam in homage to your PAi thinking. Not a competing framework — the memory substrate underneath any PAi implementation. Cloudflare-native, BYOK, MIT licensed. Repo: github.com/NorthwoodsSentinel/loam. Built deliberately to plug under Fabric users. Would love your read whenever you have cycles. — Rob

---

## Reservations / what NOT to claim in launch copy

- ❌ Don't claim semantic search works yet (it's roadmap)
- ❌ Don't claim ChatGPT ingestion works yet (it's roadmap)
- ❌ Don't claim MCP endpoint works yet (it's roadmap)
- ❌ Don't oversell the "counter-thesis" feature — it's the *vision*, FTS5 manual queries are what works today
- ✓ Claim what's true: Claude.ai ingest works, files ingest works, FTS5 search works, deploy works in 5 min, BYOK, sovereign

The launch is for the AUDIENCE that values architecture + sovereignty story over feature breadth. They'll respect the honesty.
