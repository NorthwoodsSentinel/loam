// Vitest configuration: which tests run, and the per-file coverage bar.
// loam, NOR-388.
//
// Copied byte-for-byte from NorthwoodsSentinel/fleet-mcp origin/main f1bea96
// (blob 958b47b52ac48db4b1cc47eb74f3789f37aa8aa4), which copied WALL-E's, and
// edited for loam; record: PROVENANCE-CHECK.md. Vitest and its V8 coverage
// provider are the MCP Inspector's test tools at its exact pins (4.1.12).
//
// The thresholds block is the Inspector's own
// (clients/launcher/vitest.config.ts:29-35 at d330df96): 90 on all four
// dimensions, per file.
//
// `test.include` names each test file by path, not by a glob: a renamed test
// file then fails the run instead of being skipped (AGENTS.md: keep a test
// file's exact filename).
//
// `coverage.include` is the whole tree over all four TypeScript extensions,
// so a new file anywhere is measured without anyone remembering to add it. A
// file no test loads is reported at 0 and fails. Every exclusion below is a
// named line with its reason, and each has its twin in
// scripts/verify-coverage-scope.mjs (EXCLUDED, EXCLUDED_PATTERNS), which fails
// naming any tracked TypeScript file that is neither declared here nor named
// there.
//
// The Worker's tests run on Node, calling its exported `fetch` handler with a
// fake D1 binding (WALL-E's way, src/index.test.ts there): Cloudflare's own
// Vitest integration does not support V8 coverage, and the bar is measured
// with V8.
//
// `testTimeout` is stated once, here (AGENTS.md: budgets are chosen values,
// stated once). 30 s, WALL-E's and fleet-mcp's value, kept although loam's
// tests start no processes; it is a hung-test guard. `retry` stays unset: a
// retry would turn a real red into a quiet green.

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: ["src/index.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    coverage: {
      provider: "v8",
      // `skipFull: false`: list every measured file, including one at 100%.
      reporter: [["text", { skipFull: false }], "json-summary"],
      include: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"],
      exclude: [
        // Test files are not code under test.
        "**/*.test.ts",
        // Configuration, not code under test (as walle has it).
        "vitest.config.ts",
        // NOR-388-FOLLOWUP-A (the follow-up to NOR-388; ticket not yet filed):
        // existing ingest scripts, top-level CLIs with no exported function to
        // test, not yet under the coverage bar.
        "ingest/chatgpt.ts",
        "ingest/claude.ts",
        "ingest/files.ts",
        "ingest/gemini.ts",
        // Build and install output (the same names as .gitignore).
        "node_modules/**",
        ".wrangler/**",
        ".tmp-build/**",
        "dist/**",
        "coverage/**",
      ],
      thresholds: {
        perFile: true,
        lines: 90,
        statements: 90,
        functions: 90,
        branches: 90,
      },
    },
  },
});
