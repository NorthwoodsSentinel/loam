# KINTSUGI

Repairs in this repo are marked, not hidden. Each fix carries the same gold line in three
places: a `kintsugi:` comment at the repair site (where the file has comment syntax), a
`Kintsugi:` trailer on the commit, and a row here. The ledger is append-only. A row never
claims a review before one exists.

| Date | What broke | How it was mended | Mended by / reviewed by | Gold line |
|---|---|---|---|---|
| 2026-10-31 | The toolchain was a major version behind (wrangler 3) with no lockfile, so installs were unpinned and unaudited. | wrangler 4.156, workers-types v5, Node 22 declared, package-lock.json committed; npm audit 0; dry-run builds. | CeeCee / review pending (toolchain only) | the soil had gone a season unturned — / now it is tilled, and each seed has a name. |
| 2026-11-15 | Nothing checked a change before it merged: no CI, no tests, no lint or format check, no sign-off check. | NOR-388: the `validate` CI check (action pins, format, lint with no warning tier, typecheck of every tracked TypeScript file, tests, dry-run build), per-file coverage at 90 with a scope guard, and the `DCO` check, copied from fleet-mcp (Cliff Hall's tooling). Product code: formatting and type annotations only, compiled output unchanged. | CeeCee / review pending (Codex audit in the PR) | the ground had no fence and no gate — / now each furrow is walked before it is sown. |
