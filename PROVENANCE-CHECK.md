# PROVENANCE-CHECK

This file records where the files NOR-388 brought into this repo came from, and how to check that each is what it claims to be. It follows private source B's `PROVENANCE-CHECK.md`. `PROVENANCE.md` belongs to the rules file.

Two of the sources are private repositories of the same owner. This repository is public, so they are called **private source A** and **private source B** here and in the file headers, and their names, commit ids and file ids are not published (NOR-691). private source A adopted the MCP Inspector's files first; private source B copied them from private source A; loam copied them from private source B.

- Date: 2026-11-15
- Ticket: NOR-388 (part of NOR-381)
- No design document of its own: every guard below was designed, Codex-reviewed and attack-tested in private source A or private source B, and is copied from there. What differs here is listed per file.

## 1. Files copied, then edited

Every file below was added byte-for-byte in one commit that adds nothing else, and edited in later commits. Find it with `git log --diff-filter=A --format=%H -- scripts/dco-check.mjs`; call it `ADDED`.

- `git rev-parse ADDED:<path>` prints the blob id in the table, for each file. A Git blob id is a hash of the content, so equal ids mean equal bytes. The ids in the table are this repository's own, at `ADDED`. That each equals the file in private source B is this record's claim: only someone with access to private source B can check it.
- `git diff ADDED HEAD -- <path>` is the complete list of lines this repo changed. Each file's header names its edits.

Source repo: private source B. private source B's own record of where each came from (private source A, and the MCP Inspector at `d330df9617e44ec893bc1a53618662239342d433`) is its `PROVENANCE-CHECK.md`, sections 1 and 4. The path is the same in both repos.

| Path | Lines | Git blob id | Edits here |
| --- | --- | --- | --- |
| `scripts/dco-check.mjs` | 261 | `5338fedd25763bc4b7cb454c1eb432d7deaf8a1d` | A provenance paragraph only |
| `scripts/dco-check.test.mjs` | 348 | `7fd4bd08dd3c7bddf14c1076ad7f2a7894ccec50` | A provenance paragraph only |
| `scripts/lib/main-module.mjs` | 77 | `b35c2374c50999bf1f5a1a2fd19d990ff960b63f` | A provenance paragraph only |
| `scripts/lib/main-module.test.mjs` | 86 | `66adff993cd1609c4af368f60df4b38a73923922` | A provenance paragraph only |
| `scripts/lib/ts-inventory.mjs` | 76 | `03fbcc1eafcbd9954cea717a25b6034977b0b51e` | A provenance paragraph only |
| `scripts/ts-inventory.test.mjs` | 51 | `752a615b9ccd75a3746e96cb72d563c0319ae410` | A provenance paragraph only |
| `scripts/verify-action-pins.mjs` | 364 | `011a04c44ce9769bd15f8bfa82cb27d89162e957` | A provenance paragraph; the failure message cites AGENTS.md instead of private source B's ticket; the entry check uses `isMainModule` (Codex audit, HIGH; section 6) |
| `scripts/verify-action-pins.test.mjs` | 452 | `82686195e6538f7f2f7fad30bf62a4701d2ed630` | A provenance paragraph only |
| `scripts/verify-coverage-scope.mjs` | 553 | `d7942703ca4f96128fa78ef31f2383862b8ce400` | `EXCLUDED` and `EXCLUDED_PATTERNS` name loam's files; the report names `loam`; the entry check uses `isMainModule` (section 6); a provenance paragraph. Comparison logic unchanged |
| `scripts/verify-coverage-scope.test.mjs` | 331 | `34d5bb9a0dd2accf33ffbd51557b7f9a009ecb0e` | One assertion expects `loam:`; a provenance paragraph |
| `scripts/verify-typecheck-coverage.mjs` | 217 | `fd9163fdd668cf2ead9aeb10040a0227ed43d20a` | Three projects instead of one (`PROJECTS`; `programFiles` takes the project; `run` takes the union and fails if any project fails or the list is empty); the entry check uses `isMainModule` (section 6); a provenance paragraph |
| `scripts/verify-typecheck-coverage.test.mjs` | 67 | `719fcbcbf856e2fb06c743ea062c4ddd9e928f24` | The last case expects loam's marker; five cases added for the projects edit, against a fake compiler |
| `.github/workflows/main.yml` | 113 | `7932a098e637e270effd73a6bb05c2ce8b7a9108` | Header rewritten for loam; Node only (Bun setup and its pin removed: loam's gate runs no Bun); `npm ci` from `package-lock.json`; run line `validate && coverage` (no `smoke`: loam is not an MCP server) |
| `.github/workflows/dco.yml` | 190 | `9d3165be6059d7798e32719ccb1510ba5db2294c` | A loam paragraph; the PR job's base checkout back to the source's `persist-credentials: false` (loam is public; private source B's `true` was for a private repo's fetch). Triggers, jobs and pins unchanged |
| `vitest.config.ts` | 102 | `958b47b52ac48db4b1cc47eb74f3789f37aa8aa4` | Header rewritten; one test file; loam's exclusions (the four ingest scripts on lines citing the follow-up; `.tmp-build/`). Thresholds unchanged |
| `eslint.config.js` | 81 | `24be32c48853228cc0437f8d82fe728a6ef0d566` | Three parser projects; loam's ignore list; a provenance paragraph. Rule set unchanged |
| `.prettierignore` | 13 | `5c8bf4c839ca30b13bef0bcb7272372a81ba5fe0` | Rewritten for loam's two entries |
| `CLAUDE.md` | 1 | `285e0f5b36b49281317758e0d5b7c48b034eeb66` | None (`@./AGENTS.md`) |

## 2. Written here, from a named source

| File | Source | What was taken |
| --- | --- | --- |
| `AGENTS.md` | private source B `AGENTS.md` | Line by line in `PROVENANCE.md`. Not committed byte-for-byte first: private source B's text names private infrastructure that does not belong in a public repo's history |
| `tsconfig.tools.json` | private source A `tsconfig.tools.json` | A second project beside the Worker's, with Node's types instead of Bun's; `include` names `vitest.config.ts` |
| `src/index.test.ts` | private source A `src/index.test.ts` (NOR-366) | The method: call the Worker's `fetch` on Node with a fake D1 binding, because Cloudflare's Vitest integration does not support V8 coverage. The cases are loam's |
| `package.json` scripts | private source B and private source A `package.json` | Script names and the `validate` / `coverage` / `local:gate` split; `dco:check`, `local:dco`; devDependency ranges and exact pins as private source B and private source A have them (`vitest` and `@vitest/coverage-v8` 4.1.12 and `prettier` 3.8.4 exact); private source A's `overrides` entry for `minimatch`; `yaml`, which `verify-action-pins.mjs` imports |
| `package.json` `build` | private source B's `build` (`wrangler deploy --dry-run --outdir dist`) | Run against a copy of `wrangler.jsonc.template` in `.tmp-build/` (already in `.gitignore`), because `wrangler.jsonc` is the user's own file and the template's extension is not one wrangler reads |

## 3. Not copied, and why

- private source B's Codex attack-case suites (`tools/action-pins.attack.test.ts`, `tools/dco.attack.test.ts`, `tools/attack-*.test.ts`) and the designs they belong to (`docs/DESIGN-nor-349-signoff.md`, `docs/DESIGN-nor-355-check.md` and their attack-case files). They were written against private source B's and private source A's configuration (their `local:gate` lines, file counts and fixtures) and would need rewriting, not copying; the guards' own `node --test` suites came with them. Several file headers above still name these files; they live in private source B.
- `scripts/smoke-inspector.mjs` and the `client-smoke` skill: loam is not an MCP server.
- `scripts/verify-skills.mjs`: loam has no skills; `AGENTS.md` says the first skill brings it.

## 4. Action pins

Both workflows use `actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1` and `actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0`, private source B's and private source A's pins. Re-read on 2026-11-15 with `gh api repos/<owner>/<repo>/git/ref/tags/<tag>` (object type `commit`, the SHA above) and `releases/latest` (the same tag) for both.

## 5. The sign-off check and this repo's unsigned history

loam's commits before NOR-388 carry no sign-off. The `DCO (main push)` job checks `github.event.before..github.event.after`, so a push to `main` checks only the commits that push added; everything already on `main` is reachable from `before` and excluded. The PR job checks `origin/main..<head>`, which is only this PR's commits, each signed off (checked with `npm run local:dco`).

## 6. Fixed after Codex's audit of `8e2e46c`

Codex (read-only, through the `codex-review` wrapper) found one HIGH: `verify-action-pins.mjs`, `verify-typecheck-coverage.mjs` and `verify-coverage-scope.mjs`, as copied from private source B, decided whether to run by comparing `import.meta.url` with `process.argv[1]` inline. Started through a symlinked checkout, Node resolves the module's real path while `argv[1]` keeps the link, so each guard ran nothing and exited 0. Reproduced here before fixing (all three: exit 0, no output). Each now uses `isMainModule` from `scripts/lib/main-module.mjs`, the helper `dco-check.mjs` already used, which private source A hardened for this case. `scripts/entry-points.test.mjs` (in `test:scripts`) starts all four guards through a symlink and fails if one stays silent; it failed on the three unfixed guards and passes now.

## 7. The two private sources made neutral (NOR-691)

On 2026-11-22 the names of the two private repositories were taken out of every tracked file and replaced by "private source A" and "private source B", and the ids of their commits and files that stood beside the names were removed. Ids of the public MCP Inspector's commits and files are kept. This touched the headers of the copied files, so `git diff ADDED HEAD -- <path>` now shows that change as well, and a header sentence saying "this paragraph is the only edit" was written before it and does not count it.

Three changes went beyond a name or an id:

- `scripts/verify-action-pins.mjs`, header item 6: the description of how an earlier copy read its files was removed. The item now says only what this copy does.
- `scripts/verify-coverage-scope.mjs`: the reason strings of its two exclusions lost a parenthesis that named a source. `vitest.config.ts` carries the same comment and lost the same words.
- Section 6 above: its last sentence, about another repository's copies, was removed. It was no longer true.

History is unchanged. This is a change to the files as they stand, not a rewrite of earlier commits.
