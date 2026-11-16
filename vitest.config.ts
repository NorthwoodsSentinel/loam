// Vitest configuration: which tests run, and the per-file coverage bar.
// NOR-355; design: docs/DESIGN-nor-355-check.md, sections 3 and 4.
//
// Copied from WALL-E's vitest.config.ts (NorthwoodsSentinel/walle origin/main
// 5fb8747, blob 14deab78) and edited for this repo. Vitest and its V8
// coverage provider are the MCP Inspector's test tools at its exact pins
// (4.1.12). They measure NEW TypeScript here; the existing suite stays on
// `bun test` (`npm run test:portable`), because Bun's coverage has no branch
// figure and does not list a file no test loads (measured on Bun 1.3.14,
// design section 2). NOR-364 brought existing files under the bar with new
// Vitest tests beside them; the Bun suite stays where it is.
//
// The thresholds block is the Inspector's own
// (clients/launcher/vitest.config.ts:29-35 at d330df96): 90 on all four
// dimensions, per file.
//
// `test.include` names each test file by path, not by a glob: a renamed test
// file then fails the run instead of being skipped (AGENTS.md: keep a test
// file's exact filename). tools/test-report.ts also checks that every file
// named like a test outside test/ is listed here.
//
// `coverage.include` is the whole tree over all four TypeScript extensions,
// so a new file anywhere is measured without anyone remembering to add it. A
// file no test loads is reported at 0 and fails. Every exclusion below is a
// named line with its reason, and each has its twin in
// scripts/verify-coverage-scope.mjs (EXCLUDED, EXCLUDED_PATTERNS), which fails
// naming any tracked TypeScript file that is neither declared here nor named
// there.
//
// `testTimeout` is stated once, here (AGENTS.md: budgets are chosen values,
// stated once). 30 s, WALL-E's value: the slowest cases start real processes
// (git, node, bun, tsc). `retry` stays unset: a retry would turn a real red
// into a quiet green.

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: [
      "tools/action-pins.attack.test.ts",
      "tools/attack-pins.test.ts",
      "tools/attack-inventory.test.ts",
      "tools/attack-coverage.test.ts",
      "tools/attack-workflow.test.ts",
      "tools/test-report.test.ts",
      "tools/dco.attack.test.ts",
      "src/source-fixture.test.ts",
      "src/worker.test.ts",
      "tools/validate-fixture.test.ts",
      "tools/vendor-courier.test.ts",
      "src/core.test.ts",
      "src/kernel.test.ts",
      "tools/evidence-envelope.test.ts",
      "src/server.test.ts",
      "src/http.test.ts",
      "tools/evidence-entries.test.ts",
      "tools/fixture-evidence.test.ts",
      "tools/dispatch-reply.test.ts",
      "src/remote-dispatch.test.ts",
    ],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    coverage: {
      provider: "v8",
      // `skipFull: false`: list every measured file, including one at 100%.
      reporter: [["text", { skipFull: false }], "json-summary"],
      include: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"],
      exclude: [
        // Test files, the Bun suite and its helpers are not code under test.
        "**/*.test.ts",
        "test/**",
        // Configuration, not code under test (as walle has it).
        "vitest.config.ts",
        // Vendored byte-identical from pai-shuttle; test/vendor.test.ts fails
        // on any edit. Not NOR-364: its upstream is pai-shuttle.
        "vendor/courier/**",
        // NOR-375 (the follow-up to NOR-364): existing first-party code, not yet
        // under the coverage bar.
        "src/source-lares.ts",
        "src/transport.ts",
        "tools/fixture-add-observer.ts",
        "tools/make-fixture.ts",
        "tools/observer-entry.ts",
        // Build and install output (the same names as .gitignore).
        "node_modules/**",
        ".wrangler/**",
        "dist/**",
        "coverage/**",
        ".test-report/**",
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
