#!/usr/bin/env node
// verify:typecheck-coverage — every tracked TypeScript file gets a `tsc` pass,
// or is named in EXCLUDED with its reason. Design: the check's design
// note in private source B, "Every tracked TypeScript file is typechecked
// and coverage-measured, or named" (Codex design review r1, finding 1).
//
// ADAPTED from phase 2 of the MCP Inspector's scripts/verify-typecheck-coverage.mjs
// (modelcontextprotocol/inspector d330df9617e44ec893bc1a53618662239342d433,
// blob 1f71e2c4bed881dbb63fa6b85f37d33e719c9548, lines 620-679): list the
// program with `tsc --listFilesOnly` (it includes import-reached files), take
// the tracked-file inventory, and fail naming each tracked file in no program.
// His phase 1 (client enrollment, wiring checks, sibling vouching) is left
// out: this repo has one install and one project, and `typecheck` runs this
// guard itself, so the wiring is the script line.
//
// Added here, as in the coverage-scope guard: an EXCLUDED map whose entries
// are exact paths with reasons; a reasonless, untracked or now-typechecked
// entry fails as stale (the Inspector's KNOWN_OMISSIONS rules,
// verify-coverage-scope.mjs lines 162-198). EXCLUDED mirrors the tsconfig
// `exclude`; a file excluded there and not named here fails.
//
// Fails closed: a compiler that exits non-zero, dies by signal, prints an
// unusable record or lists nothing is a failure, not an empty program; an
// empty or failed inventory is a failure. Paths are compared canonically
// (resolved, realpath'd, repo-relative), so a symlinked checkout passes and a
// `<repo>-copy/...` path cannot stand for an in-repo file.
//
// kintsugi: NOR-700. the furrows still bore another field's stakes — / now each row is named in its own soil.
// In loam (NOR-388): copied byte-for-byte from private source B (record:
// PROVENANCE-CHECK.md), then edited. One edit: loam has three TypeScript
// projects, not one (the Worker under Cloudflare's types, the ingest scripts
// under Node's, and the test configuration), so `PROJECTS` names them,
// `programFiles` takes the project to list, and `run` takes the union of
// their programs. Each project is listed the same way and fails the same way;
// a file is typechecked when any of them holds it.

import { spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isMainModule } from "./lib/main-module.mjs";
import { trackedTypeScript } from "./lib/ts-inventory.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

/**
 * Exact repo-relative path → reason. Empty since the last excluded files
 * were brought into the program.
 *
 * @type {Record<string, string>}
 */
export const EXCLUDED = {};

/**
 * loam (NOR-388): the tsconfig projects `npm run typecheck` runs, each listed
 * with `--listFilesOnly`. Kept in step with the `typecheck` script.
 */
export const PROJECTS = [
  "tsconfig.json",
  "ingest/tsconfig.json",
  "tsconfig.tools.json",
];

const GLOB_CHARS = /[*?[\]{}!]/;
const hasReason = (r) => typeof r === "string" && r.trim() !== "";
const slash = (p) => p.split(path.sep).join("/");

/**
 * The TypeScript compiler's entry file, resolved from the repo's own install
 * and run with this Node (the source's `tscEntry` approach).
 *
 * @param {string} root
 */
export function tscEntry(root) {
  return createRequire(path.join(root, "package.json")).resolve(
    "typescript/bin/tsc",
  );
}

/**
 * Run `tsc -p <project> --listFilesOnly` and return the repo-relative
 * files of the program that are inside the repo.
 *
 * @param {string} root
 * @param {string} tsc path to a tsc entry script
 * @param {string} [project] loam (NOR-388): the project to list
 * @returns {{ files: string[] } | { failure: string }}
 */
export function programFiles(root, tsc, project = "tsconfig.json") {
  const ran = spawnSync(
    process.execPath,
    [tsc, "-p", project, "--listFilesOnly"],
    { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  if (ran.error)
    return { failure: `could not run the compiler: ${ran.error.message}` };
  if (ran.signal)
    return { failure: `the compiler was killed by ${ran.signal}` };
  if (ran.status !== 0)
    return {
      failure: `the compiler exited ${ran.status} on ${project}:\n${(ran.stdout + ran.stderr).trim()}`,
    };
  const records = ran.stdout.split(/\r?\n/).filter((l) => l !== "");
  if (records.length === 0)
    return {
      failure: `the compiler listed no files for ${project} — an empty program is not evidence`,
    };
  const realRoot = realpathSync(root);
  const files = [];
  for (const record of records) {
    if (record.includes("\0") || record.includes("�"))
      return {
        failure: `the compiler printed an unusable path record: ${JSON.stringify(record)}`,
      };
    if (!path.isAbsolute(record)) continue;
    let real;
    try {
      real = realpathSync(path.resolve(record));
    } catch {
      continue;
    }
    const rel = path.relative(realRoot, real);
    if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) continue;
    files.push(slash(rel));
  }
  return { files };
}

/**
 * @param {{
 *   tracked: readonly string[],
 *   program: readonly string[],
 *   excluded: Record<string, string>,
 * }} input
 * @returns {string[]} failures
 */
export function diffTypecheck({ tracked, program, excluded }) {
  if (tracked.length === 0)
    return [
      "the tracked TypeScript inventory is empty — nothing to check is a failure, not a pass",
    ];
  const failures = [];
  const inProgram = new Set(program);
  const trackedSet = new Set(tracked);
  for (const [entry, reason] of Object.entries(excluded)) {
    if (GLOB_CHARS.test(entry))
      failures.push(`EXCLUDED names ${entry}, a pattern — exact paths only`);
    else if (!hasReason(reason))
      failures.push(`EXCLUDED names ${entry} without a reason`);
    else if (!trackedSet.has(entry))
      failures.push(
        `EXCLUDED names ${entry}, which is not a tracked TypeScript file — stale; remove it`,
      );
    else if (inProgram.has(entry))
      failures.push(
        `EXCLUDED names ${entry}, which the program now typechecks — stale; remove it`,
      );
  }
  const missing = tracked.filter(
    (f) =>
      !inProgram.has(f) &&
      !(Object.hasOwn(excluded, f) && hasReason(excluded[f])),
  );
  if (missing.length > 0)
    failures.push(
      `${missing.length} tracked TypeScript file(s) are in no TypeScript program and not named in EXCLUDED:\n` +
        missing.map((f) => `    ${f} — in no tsconfig project`).join("\n"),
    );
  return failures;
}

/**
 * @param {{
 *   root?: string,
 *   tsc?: string,
 *   excluded?: Record<string, string>,
 *   inventory?: (root: string) => string[],
 *   projects?: readonly string[],
 * }} [deps]
 * @returns {{ failures: string[], checked: number }}
 */
export function run({
  root = repoRoot,
  tsc,
  excluded = EXCLUDED,
  inventory = trackedTypeScript,
  projects = PROJECTS,
} = {}) {
  let tracked;
  try {
    tracked = inventory(root);
  } catch (error) {
    return { failures: [error.message], checked: 0 };
  }
  if (tracked.length === 0)
    return {
      failures: diffTypecheck({ tracked, program: [], excluded }),
      checked: 0,
    };
  let entry;
  try {
    entry = tsc ?? tscEntry(root);
  } catch (error) {
    return {
      failures: [`cannot find the TypeScript compiler: ${error.message}`],
      checked: 0,
    };
  }
  // loam (NOR-388): the union of every project's program; any project that
  // fails to list fails the run.
  if (projects.length === 0)
    return { failures: ["no TypeScript project to list"], checked: 0 };
  const program = new Set();
  for (const project of projects) {
    const listed = programFiles(root, entry, project);
    if ("failure" in listed) return { failures: [listed.failure], checked: 0 };
    for (const f of listed.files) program.add(f);
  }
  return {
    failures: diffTypecheck({ tracked, program: [...program], excluded }),
    checked: tracked.length,
  };
}

// loam (NOR-388, Codex audit of 8e2e46c, HIGH): the entry check is the shared
// isMainModule (scripts/lib/main-module.mjs), as dco-check.mjs uses it. The
// copied inline comparison was false when the checkout is reached through a
// symlink, so the guard ran nothing and exited 0.
if (isMainModule(import.meta.url)) {
  const { failures, checked } = run();
  if (failures.length > 0) {
    console.error(
      `verify:typecheck-coverage — ${failures.length} failure(s):\n`,
    );
    for (const f of failures) console.error(`  ${f}`);
    console.error(
      "\nEvery tracked TypeScript file must be in one of the projects in PROJECTS. Add it to a project's `include`, or name it in EXCLUDED with its ticket. See AGENTS.md.",
    );
    process.exit(1);
  }
  console.log(
    `verify:typecheck-coverage — OK: all ${checked} tracked TypeScript file(s) get a tsc pass or are named in EXCLUDED (${Object.keys(EXCLUDED).length}).`,
  );
}
