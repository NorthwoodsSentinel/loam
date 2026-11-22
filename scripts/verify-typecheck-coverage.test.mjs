// Unit tests for scripts/verify-typecheck-coverage.mjs: the
// comparison of the inventory with the program and the EXCLUDED rules, and
// that the shipped EXCLUDED entries carry reasons. Codex's attack cases for
// the guard (14-20) are a separate suite in private source B, against a real
// compiler and fake ones. Run via `npm run test:scripts`.
//
// kintsugi: NOR-700. the furrows still bore another field's stakes — / now each row is named in its own soil.
// In loam (NOR-388): copied byte-for-byte from private source B, then
// edited: the last test asks for this repo's follow-up marker instead of
// private source B's ticket number, and the cases at the end test loam's one edit to the
// guard (several projects, their union). private source B's Codex attack cases
// were not copied; PROVENANCE-CHECK.md
// says why.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  EXCLUDED,
  PROJECTS,
  diffTypecheck,
  run,
} from "./verify-typecheck-coverage.mjs";

test("a tracked file in no program and not excluded fails by name", () => {
  const failures = diffTypecheck({
    tracked: ["a.ts", "b.ts"],
    program: ["a.ts"],
    excluded: {},
  });
  assert.equal(failures.length, 1);
  assert.match(failures[0], /b\.ts — in no tsconfig project/);
});

test("an excluded file passes; reasonless, pattern, untracked and stale entries fail", () => {
  assert.deepEqual(
    diffTypecheck({
      tracked: ["a.ts", "b.ts"],
      program: ["a.ts"],
      excluded: { "b.ts": "a reason" },
    }),
    [],
  );
  const failures = diffTypecheck({
    tracked: ["a.ts", "b.ts"],
    program: ["a.ts", "b.ts"],
    excluded: {
      "c.ts": "a reason",
      "b.ts": "a reason",
      "x/**": "a reason",
      "a.ts": " ",
    },
  });
  assert.equal(failures.length, 4);
});

test("an empty inventory fails", () => {
  assert.match(
    diffTypecheck({ tracked: [], program: ["a.ts"], excluded: {} })[0],
    /inventory is empty/,
  );
  assert.match(run({ inventory: () => [] }).failures[0], /inventory is empty/);
});

test("an inventory that throws, or a missing compiler, fails", () => {
  const thrown = run({
    inventory: () => {
      throw new Error("git broke");
    },
  });
  assert.deepEqual(thrown.failures, ["git broke"]);
  const noTsc = run({ root: "/", inventory: () => ["a.ts"] });
  assert.match(noTsc.failures[0], /cannot find the TypeScript compiler/);
});

test("the shipped EXCLUDED entries are exact paths with NOR-388 follow-up reasons", () => {
  for (const [entry, reason] of Object.entries(EXCLUDED)) {
    assert.doesNotMatch(entry, /[*?[\]{}!]/);
    assert.match(reason, /NOR-388/);
  }
});

// ---- loam (NOR-388): several projects ----

/**
 * A throwaway root with a fake compiler: a Node script that prints, for the
 * project named after `-p`, the absolute paths given in `listing`, or exits
 * 2 for a project listed in `failing`.
 *
 * @param {Record<string, string[]>} listing project -> repo-relative files
 * @param {string[]} [failing]
 */
function fakeCompiler(listing, failing = []) {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), "tc-projects-")));
  for (const files of Object.values(listing))
    for (const f of files) writeFileSync(path.join(root, f), "");
  const tsc = path.join(root, "fake-tsc.mjs");
  writeFileSync(
    tsc,
    `const listing = ${JSON.stringify(listing)};
const failing = ${JSON.stringify(failing)};
const project = process.argv[process.argv.indexOf("-p") + 1];
if (failing.includes(project)) { console.error("broken " + project); process.exit(2); }
for (const f of listing[project] ?? []) console.log(${JSON.stringify(root)} + "/" + f);
`,
  );
  return { root, tsc };
}

test("the shipped PROJECTS are the three loam typecheck projects", () => {
  assert.deepEqual(PROJECTS, [
    "tsconfig.json",
    "ingest/tsconfig.json",
    "tsconfig.tools.json",
  ]);
});

test("a file is typechecked when any project holds it (the union)", (t) => {
  const { root, tsc } = fakeCompiler({
    "p1.json": ["a.ts"],
    "p2.json": ["b.ts"],
  });
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const result = run({
    root,
    tsc,
    excluded: {},
    inventory: () => ["a.ts", "b.ts"],
    projects: ["p1.json", "p2.json"],
  });
  assert.deepEqual(result, { failures: [], checked: 2 });
});

test("a file no project holds fails by name", (t) => {
  const { root, tsc } = fakeCompiler({
    "p1.json": ["a.ts"],
    "p2.json": ["b.ts"],
  });
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(path.join(root, "c.ts"), "");
  const { failures } = run({
    root,
    tsc,
    excluded: {},
    inventory: () => ["a.ts", "b.ts", "c.ts"],
    projects: ["p1.json", "p2.json"],
  });
  assert.equal(failures.length, 1);
  assert.match(failures[0], /c\.ts — in no tsconfig project/);
});

test("one project that fails to compile, or lists nothing, fails the run", (t) => {
  const { root, tsc } = fakeCompiler(
    { "p1.json": ["a.ts"], "empty.json": [] },
    ["p2.json"],
  );
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const broken = run({
    root,
    tsc,
    excluded: {},
    inventory: () => ["a.ts"],
    projects: ["p1.json", "p2.json"],
  });
  assert.equal(broken.failures.length, 1);
  assert.match(broken.failures[0], /the compiler exited 2 on p2\.json/);
  const empty = run({
    root,
    tsc,
    excluded: {},
    inventory: () => ["a.ts"],
    projects: ["p1.json", "empty.json"],
  });
  assert.match(empty.failures[0], /listed no files for empty\.json/);
});

test("an empty project list fails rather than passing", (t) => {
  const { root, tsc } = fakeCompiler({ "p1.json": ["a.ts"] });
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const { failures } = run({
    root,
    tsc,
    excluded: {},
    inventory: () => ["a.ts"],
    projects: [],
  });
  assert.deepEqual(failures, ["no TypeScript project to list"]);
});
