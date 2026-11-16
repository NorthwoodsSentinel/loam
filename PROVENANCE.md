# Provenance of `AGENTS.md`

- **Copied from**: `NorthwoodsSentinel/fleet-mcp` (private), `origin/main` = `f1bea96`, file `AGENTS.md` (217 lines, Git blob `058b489b3b79f3013802708c74219bb2b5520f37`). fleet-mcp is the org's worked example of Cliff Hall's tooling; its own `PROVENANCE.md` maps each of its lines to WALL-E's `AGENTS.md` and, through WALL-E's, to the source.
- **The source**: `modelcontextprotocol/inspector` (public), branch `v2/main`, commit `d330df9617e44ec893bc1a53618662239342d433`, `AGENTS.md` (698 lines), by Cliff Hall. The Inspector line behind each fleet-mcp line is not re-derived here: take the fleet-mcp line number from the table below and follow fleet-mcp's `PROVENANCE.md`, then WALL-E's.
- **The owner's rulings**: 25 rules ruled on 2026-11-14 when the source was adopted (keep the source's way unless there is a stated reason to depart; signed-off commits on; coverage bar the source's; no warning tier; Todo means approved by the owner; and the rest), plus the fleet rule of 2026-11-15 on who merges. For this repo the owner's scope is "public as open PRs": an agent opens the PR and the owner merges it.
- **This repo's facts**: loam `origin/main` = `1b17d5b`: `README.md`, `KINTSUGI.md`, `package.json`, `wrangler.jsonc.template`, `.gitignore`, `tsconfig.json`, `ingest/tsconfig.json`, `src/index.ts`, `ingest/*.ts`.
- **Why not copied byte for byte first**: the other files this ticket brought in were committed unedited before being edited (`PROVENANCE-CHECK.md`). This file was not, because fleet-mcp's text names private infrastructure that has no place in a public repo's history; it was written edited, and this table is the record. `git show 058b489b3b79f3013802708c74219bb2b5520f37` in a fleet-mcp clone prints the source text.
- **Date built**: 2026-11-15. **Ticket**: NOR-388 (part of NOR-381).
- **Licence note**: as WALL-E and fleet-mcp record it, the source project's `LICENSE` states that the MCP project is in a licensing transition from the MIT License to Apache-2.0: code is under Apache-2.0 or MIT, and documentation contributions (excluding specifications) are under CC-BY-4.0. The text carried over here is from a documentation file. Attribution to the Model Context Protocol project and its contributors is kept.

## How to read the table

- **KEEP**: fleet-mcp's line unchanged.
- **ADAPT**: fleet-mcp's line with the smallest edit this repo's facts require. The row says what changed and why.
- **OURS**: text with no counterpart in fleet-mcp's file.
- **not applicable**: a fleet-mcp line left out (Table 2).
- "Ours" line numbers are lines of `AGENTS.md` in the commit that added this file. "fleet-mcp" line numbers are lines of blob `058b489b`.
- A marker "[Not yet in this repo …]" or "[No … yet in this repo]" names something the rule points at that loam does not have.

## Table 1: every part of `AGENTS.md`

| Ours | Section or rule | fleet-mcp | Verdict | What changed and why |
| --- | --- | --- | --- | --- |
| 1 | Title | 1 | ADAPT | This repo's name. |
| 3 | What the repo is | 3 | ADAPT | fleet-mcp's description replaced by loam's, from `README.md` and `src/index.ts`: a Worker with an HTML UI and bearer-token API over D1 FTS5, plus local ingest scripts. "No published package" kept. "Public" added (the repo's visibility). The owner's sentence on who carries work changed from "through to merge" to "through to an open pull request, and the owner merges": the owner's scope for this repo (NOR-381). |
| 5 | The data and credentials are the user's | 5 | ADAPT | fleet-mcp's authority-boundary line is about its own server. Its place is taken by loam's boundary, from `.gitignore` (`wrangler.jsonc`, `exports/`, `*.zip`), `wrangler.jsonc.template` and README "The data lives on YOUR Cloudflare account". |
| 7 | "This file holds the rules" | 7 | KEEP | |
| 9 | Procedures live in `.claude/skills/` | 9 | ADAPT | "when they exist" and a marker added: loam has no skills (fleet-mcp has one, `client-smoke`, which drives an MCP server; loam is not one). |
| 11 | Pointer to `PROVENANCE.md` | 11 | KEEP | |
| 13-15 | Skills index | 13-19 | ADAPT | fleet-mcp's table and its `client-smoke` row removed (no skill here); the rule that a change adding a skill adds its row, with the table's columns, kept as one sentence. |
| 17-19 | Development setup; the Inspector's runner | 21-23 | KEEP | |
| 20 | How this repo's code runs | 24 | ADAPT | fleet-mcp runs on Bun; loam's gate runs on Node with npm and the committed lockfile (`package.json` `engines`, `package-lock.json` from NOR-155). The build is the dry-run against a copy of the template (`.tmp-build/` was already in `.gitignore`). The ingest scripts' Bun usage is from README. |
| 22-24 | `overrides`, not `npm audit fix` | 26-28 | KEEP | Applied in this change: the `minimatch` override WALL-E carries, for the same advisory under `typescript-eslint`. |
| 26-28 | Dependency updates are issue-driven | 30-32 | ADAPT | "no `Closes NOR-<NUMBER>` and" reduced to "no ticket" (see row 52); fleet-mcp's ticket marker replaced by "[No sweeps yet in this repo]". |
| 30 | Dependabot alerts stay on | 34 | KEEP | The repo's Dependabot settings were not read (repository settings are the owner's). |
| 31 | Read back a UI-only setting | 35 | KEEP | |
| 32 | Actions pinned by SHA; here, every job | 36 | KEEP | fleet-mcp's reason for every job (the checked commit is what the owner deploys as the Worker) holds for loam's Worker as written. |
| 34-36 | The upstream watch | 38-40 | ADAPT | fleet-mcp's upstreams (MCP SDK, vendored courier) replaced by loam's: wrangler and the Workers types. The Inspector's rules files kept. Marker without a ticket. |
| 38-46 | Sweep rules | 42-50 | KEEP | Nine lines. |
| 48-50 | Contributing | 52-54 | ADAPT | fleet-mcp's agent-merges rule (fleet rule, 2026-11-15) does not apply: for this public repo the owner's scope (NOR-381) is "open PRs", and merging stays his. The agent's steps up to the open PR are kept; "never merges" added. |
| 52 | Every PR must reference an issue | 56 | ADAPT | `Closes NOR-<NUMBER>` widened to "the issue key as the first line" with `Part of NOR-<NUMBER>` for one part of a larger issue, the form this ticket's PR uses (its parent stays open when it merges). |
| 54 | Outside contributions welcome | none | OURS | fleet-mcp is private; loam is public and its README invites issues and PRs ("Project status"). States that the gate judges them too. |
| 56-68 | Project Status and Direction | 58-70 | ADAPT | Release row: "what is deployed as the Worker" became "a tagged state users deploy" (each user deploys their own Worker). Repo name and visibility (public). Table widths realigned. |
| 70-79 | Keep documentation files up to date | 72-81 | KEEP | |
| 80 | Repairs are marked, not hidden | none | OURS | loam's own convention, from `KINTSUGI.md` (its first paragraph, restated). Recorded here because a rule that lives only in a file nobody loads is not enforced. |
| 82-93 | Maintaining the skills | 83-94 | ADAPT | The intro says the four rules apply when the first skill is added and that change brings `verify:skills`; marker added. The four rules and the two closing lines kept. |
| 95-108 | Issue-driven Work Style, intro to "When work begins" | 96-109 | KEEP | Except line 102: "(via `Closes NOR-<NUMBER>`)" removed, for row 52's reason. Line 105 carries the owner's 2026-11-15 ruling verbatim, as fleet-mcp has it. |
| 109 | When work is complete | 110 | ADAPT | The ruleset marker says it is the owner's act (fleet-mcp cites its own ticket). A personal-data scan of the full diff before every push added: the owner's hard limit for public repos (NOR-381, "Personal-data scan before every push"). First-line form per row 52. |
| 110 | Codex review loop | 111 | KEEP | |
| 111-112 | New tasks become issues; pace GitHub writes | 112-113 | KEEP | |
| 114-122 | Responding to Code Reviews | 115-123 | KEEP | |
| 124 | Heading | 125 | KEEP | |
| 126 | Coverage bar 90 on four dimensions | 127 | ADAPT | The bar, the tool and the owner's default kept. fleet-mcp's history (Bun suite, NOR-364, NOR-375) replaced by loam's fact: the Worker is under the bar with `src/index.test.ts`; the four ingest scripts are excluded until their follow-up. |
| 127-129 | Unreachable branch; suppress error output; exact filename | 128-130 | KEEP | |
| 130 | A coverage `include` is a whitelist | 131 | KEEP | The check it names, `scripts/verify-coverage-scope.mjs`, is in this repo (copied, `PROVENANCE-CHECK.md`). |
| 132-143 | Test-gate timeouts | 133-144 | KEEP | |
| 145-147 | Mandatory pre-push gate (heading and note) | 146-148 | ADAPT | The note lists loam's stages: no skills guard, no Bun tests, no `smoke`; the typecheck has three projects. Why no `smoke`: loam is not an MCP server (README "What's coming" lists an MCP endpoint as roadmap). |
| 149-151 | Formatter first; `local:gate` mandatory; `validate` not a substitute | 150-152 | KEEP | |
| 153-164 | Waiting on long-running work | 154-165 | KEEP | |
| 166-168 | Build output is never a gate target | 167-169 | ADAPT | Where loam's build writes: `dist/`, `.tmp-build/`, `.wrangler/`, and `coverage/`; all in `.gitignore` (`coverage/` added by this change). |
| 170-171 | Two of the source's reasons | 171-172 | KEEP | |
| 172 | Never widen an ignore; the dated exception | 173 | ADAPT | The source's sentences kept. fleet-mcp's exception (its five files under NOR-375, its vendored courier) replaced by loam's: the four ingest scripts outside coverage, by exact path, on lines citing the follow-up ticket, still to be filed (marker `NOR-388-FOLLOWUP-A`). Nothing is outside format, lint or the typecheck. |
| 174-179 | Lint has no warning tier | 175-180 | KEEP | |
| 181-182 | TypeScript for all new code; recorded exception | 182-184 | ADAPT | fleet-mcp's exception (a shell wrapper) replaced by loam's: the copied `.mjs` guards under `scripts/`, which the source and fleet-mcp also keep as JavaScript outside lint. |
| 183-195 | TypeScript bullets; floating promises | 185-196 | KEEP | |
| 197-199 | Cloudflare work (OURS): heading and scope | 198-200 | ADAPT | Still OURS (not from the Inspector). The scope sentence now says the section comes from fleet-mcp's, edited for a Worker each user deploys on their own account. |
| 201 | Deploying is the release; the owner's act | 202 | ADAPT | "For the owner's own deployment" added (users deploy their own). fleet-mcp's release-branch, ledger and `release`-skill clauses and their ticket markers dropped: loam has no release branch, ledger or skill, and their tickets are fleet-mcp's. "No workflow holds a Cloudflare credential" added (true of both workflows here). `npm run deploy` for fleet-mcp's `bun run deploy`. |
| 202 | Secrets, bindings, vars and routes by name only | 203 | ADAPT | fleet-mcp's names and its inventory marker replaced by loam's names, from `src/index.ts` (`Env`), `wrangler.jsonc.template` and the ingest scripts' environment. "Never commit `wrangler.jsonc` or an id or token" added from `.gitignore` and README "Deploy". |
| 203 | Check Cloudflare's documentation first | 204 | ADAPT | The list of behaviours names D1 and R2 (what loam uses) in place of custom domains and KV. |
| 204 | Local-runtime and deployed results are separate | 205 | ADAPT | In-process is Node under Vitest here (fleet-mcp: Bun). fleet-mcp's local-runtime marker dropped. |
| 206-208 | Only the owner does: new work, spending, secrets | 207-211 | KEEP | |
| 209 | Repository settings | 212 | ADAPT | "including rulesets and branch protection" added: the owner's hard limit for this work (NOR-381). |
| 210 | Merging a pull request into this public repository | none | OURS | The owner's scope for public repos (NOR-381). |
| 211 | Deploying the Worker | 213 | KEEP | |
| 212 | Anything public | 215 | ADAPT | "beyond the open pull request the work itself produces": in a public repo the PR is public by nature, and opening it is inside the scope the owner set. |
| 213-214 | Bindings, vars and routes; the live account | 216-217 | KEEP | |

## Table 2: what was not brought over

| fleet-mcp | Section or rule | Verdict | Reason |
| --- | --- | --- | --- |
| 5 (half) | The MCP authority boundary (`authority: "NONE"`, allowlists, the frozen fixture) | not applicable | About fleet-mcp's own server. |
| 15-17 | Skills table and its `client-smoke` row | not applicable | No skill here; `client-smoke` drives an MCP server. |
| 54 (half) | The agent merges its own PR | not applicable | The owner merges in public repos (NOR-381). |
| 214 | Removing files from a named private repository | not applicable | Names a private repository loam has no relation to; not repeated here. |

Every other fleet-mcp line is in Table 1.
