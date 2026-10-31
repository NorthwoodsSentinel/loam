# KINTSUGI

Repairs in this repo are marked, not hidden. Each fix carries the same gold line in three
places: a `kintsugi:` comment at the repair site (where the file has comment syntax), a
`Kintsugi:` trailer on the commit, and a row here. The ledger is append-only. A row never
claims a review before one exists.

| Date | What broke | How it was mended | Mended by / reviewed by | Gold line |
|---|---|---|---|---|
| 2026-10-31 | The toolchain was a major version behind (wrangler 3) with no lockfile, so installs were unpinned and unaudited. | wrangler 4.156, workers-types v5, Node 22 declared, package-lock.json committed; npm audit 0; dry-run builds. | CeeCee / review pending (toolchain only) | the soil had gone a season unturned — / now it is tilled, and each seed has a name. |
