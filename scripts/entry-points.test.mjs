// Every gate guard runs when started through a symlinked checkout. loam,
// NOR-388: Codex's audit of 8e2e46c (HIGH) found that verify-action-pins,
// verify-typecheck-coverage and verify-coverage-scope compared
// `import.meta.url` with `process.argv[1]` inline; Node resolves the entry
// module's real path while argv[1] keeps the symlink spelling, so each
// guard skipped its body and exited 0 with no output. They now use
// scripts/lib/main-module.mjs, as dco-check.mjs does. This test starts each
// one through a symlink to the repository and asserts the guard spoke; it
// does not judge the verdict (the coverage guard needs a coverage run).
// Run via `npm run test:scripts`, which names this file by path.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const GUARDS = [
  ["verify-action-pins.mjs", [], "verify:action-pins"],
  ["verify-typecheck-coverage.mjs", [], "verify:typecheck-coverage"],
  ["verify-coverage-scope.mjs", [], "verify:coverage-scope"],
  ["dco-check.mjs", ["--base", "HEAD", "--head", "HEAD"], "dco:"],
];

for (const [script, args, marker] of GUARDS) {
  test(`${script} runs when reached through a symlinked checkout`, (t) => {
    const dir = mkdtempSync(path.join(tmpdir(), "loam-entry-"));
    t.after(() => rmSync(dir, { recursive: true, force: true }));
    const link = path.join(dir, "repo");
    symlinkSync(repoRoot, link, "dir");
    const ran = spawnSync(
      process.execPath,
      [path.join(link, "scripts", script), ...args],
      { cwd: link, encoding: "utf8" },
    );
    assert.equal(ran.error, undefined);
    assert.ok(
      `${ran.stdout}${ran.stderr}`.includes(marker),
      `${script} printed nothing naming itself (exit ${ran.status}): it did not run`,
    );
  });
}
