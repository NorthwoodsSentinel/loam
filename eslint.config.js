// Lint configuration. NOR-355; design: docs/DESIGN-nor-355-check.md, section 4.
//
// Copied from WALL-E's eslint.config.js (NorthwoodsSentinel/walle origin/main
// 5fb8747, blob 109d7e55) and edited: one TypeScript block over all four
// TypeScript extensions, one parser project (tsconfig.json), and this repo's
// ignore list. The rule set is the MCP Inspector's root config (eslint.config.js
// at d330df96, blob 9990e974), reduced to one scope: `js.configs.recommended`,
// `tseslint.configs.recommended`, its `_`-prefix `no-unused-vars` block and
// type-aware `no-floating-promises` at `error`.
//
// `npm run lint` is `eslint . --max-warnings 0`: the whole tree, and a warning
// fails exactly as an error does (AGENTS.md: lint has no warning tier).
//
// The parser is given tsconfig.json. A TypeScript file outside that project
// fails lint with "was not found in any of the provided project(s)".
//
// The `.mjs` files under scripts/ are not linted, as in WALL-E and the
// Inspector (his lint scopes do not cover `scripts/`); they are
// format-checked and tested under `node --test`.

import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores([
    // Build and install output is never a gate target (AGENTS.md). The same
    // names as .gitignore.
    "node_modules/**",
    ".wrangler/**",
    "dist/**",
    "coverage/**",
    ".test-report/**",
    // The copied and new `.mjs` guards: not linted (see above).
    "scripts/**",
    // Vendored byte-identical from pai-shuttle; test/vendor.test.ts fails on
    // any edit. Not NOR-364: its upstream is pai-shuttle.
    "vendor/courier/**",
  ]),
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
      },
      parserOptions: {
        project: ["./tsconfig.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // An `_`-prefix is the explicit "intentionally unused" marker.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // A floated promise reads like an awaited one minus four characters,
      // and its rejection surfaces somewhere else entirely.
      "@typescript-eslint/no-floating-promises": "error",
    },
  },
  {
    files: ["eslint.config.js"],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
  },
]);
