# Launch post drafts

Draft copy for the public launch. Rob reviews + ships.

---

## Discord post (Daniel Miessler's community — Unsupervised Learning / Fabric)

**Channel:** `#projects` or `#show-and-tell` or whichever fits the community structure.

**Length:** short. Power users reward signal density.

---

> **Loam — the memory substrate for personal AI.** I built this for myself; the convergence with Daniel's PAI work was so clean I figured the audience here would want it.
>
> The premise: most AI memory products ask you to upload your data to *their* cloud. Loam runs on YOUR Cloudflare account. D1 + R2 + Worker, FTS5 search, BYOK. Bring your AI history (Claude.ai exports working today; ChatGPT/Gemini coming) plus any markdown directory of your notes/journal. Search across all of it sub-100ms.
>
> The goal isn't another memory tool. It's the substrate underneath whatever PAI you build — Fabric, your custom agent, Claude Desktop with MCP. Memory layer that's actually yours.
>
> Open source, MIT licensed. Deploy in ~5 minutes if you've got a Cloudflare account.
>
> Repo + deploy guide: `https://github.com/robertchuvala/loam`
>
> Roadmap: Vectorize semantic search, proactive surfacing based on your values/themes, counter-thesis surfacing (*"things you've said that contradict your current thinking"* as a first-class feature), per-user MCP server endpoint so any AI you talk to can query your Loam directly.
>
> Feedback welcome. Especially want to hear from people building Fabric workflows — the MCP layer is designed to plug under that.
>
> *— Robert*

---

## X / Twitter thread

**Length:** 8-12 tweets. Each tweet is a unit; thread tells a story.

---

1/ I built **Loam** — the memory substrate for personal AI. Bring Your Own Cloudflare. Your data stays sovereign. Search across your AI history + any notes you keep. Open source.

2/ The premise: every AI memory product so far asks you to upload your data into *their* cloud. ChatGPT memory is intra-platform. Claude Projects don't reach across providers. Mem.ai and Reflect host your second brain themselves.

3/ Loam runs on YOUR Cloudflare account. D1 + R2 + Worker. FTS5 search. Bearer-token auth. Nothing lives on infrastructure you don't own. The Loam authors never see your data.

4/ Today: ingest Claude.ai exports + any markdown directory. Sub-100ms search across both, with date and source filters, snippet highlighting, conversation drill-down.

5/ Coming soon: ChatGPT/Gemini ingestion. Vectorize semantic search. Proactive surfacing based on your values/themes (different from "search" — system brings relevant past content unprompted).

6/ The feature I haven't seen anywhere: **counter-thesis surfacing.** *"Things you've said in the past that contradict your current thinking."* First-class feature, not afterthought. Most memory tools are confirmation engines. This one will challenge you.

7/ The deeper play: per-user MCP server endpoint. Whatever AI you talk to — Claude, Cursor, your custom agent — can query YOUR Loam for context. The substrate underneath your PAI implementation.

8/ This is built in homage to @DanielMiessler's PAI thinking and Fabric. Loam isn't a competing PAI — it's the memory layer underneath any PAI implementation.

9/ MIT licensed. Deploy in 5 minutes if you've got a Cloudflare account: `github.com/robertchuvala/loam`

10/ *Memory ages. Loam ripens.*

---

## Newsletter / blog post (longer, more reflective)

Save for later. NWS-shape post arguing the sovereignty thesis with Loam as the working artifact. Don't ship tonight; let the Discord/X go first, see what lands, write the longer piece in response to feedback.

---

## Direct outreach to Daniel (DON'T SEND PRE-LAUNCH)

If Loam gets traction, Rob may want to send a direct note to Daniel introducing it. **Don't pre-launch this.** Let the work circulate organically first; if Daniel picks it up, the follow-up DM has weight. If he doesn't, Rob can decide whether to reach out cold based on what happened.

When ready, the message is short:
> Daniel — built Loam in homage to your PAI thinking. Not a competing framework — the memory substrate underneath any PAI implementation. Cloudflare-native, BYOK, MIT licensed. Repo: github.com/robertchuvala/loam. Built deliberately to plug under Fabric users. Would love your read whenever you have cycles. — Rob

---

## Reservations / what NOT to claim in launch copy

- ❌ Don't claim semantic search works yet (it's roadmap)
- ❌ Don't claim ChatGPT ingestion works yet (it's roadmap)
- ❌ Don't claim MCP endpoint works yet (it's roadmap)
- ❌ Don't oversell the "counter-thesis" feature — it's the *vision*, FTS5 manual queries are what works today
- ✓ Claim what's true: Claude.ai ingest works, files ingest works, FTS5 search works, deploy works in 5 min, BYOK, sovereign

The launch is for the AUDIENCE that values architecture + sovereignty story over feature breadth. They'll respect the honesty.
