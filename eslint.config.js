// kintsugi: NOR-700. the furrows still bore another field's stakes — / now each row is named in its own soil.
// Lint configuration. Design: the check's design note in private source B, section 4.
//
// Copied from private source A's eslint.config.js and edited: one TypeScript block over all four
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
// The `.mjs` files under scripts/ are not linted, as in private source A and the
// Inspector (his lint scopes do not cover `scripts/`); they are
// format-checked and tested under `node --test`.
//
// In loam (NOR-388): copied byte-for-byte from private source B, then
// edited: three parser projects instead of one (loam's Worker, its ingest
// scripts and its test configuration each have their own tsconfig, as private source A
// names two), so a TypeScript file in none of them fails lint; and loam's
// ignore list (no vendored code, no Bun report; `.tmp-build/`, where the
// dry-run build copies the wrangler template). The rule set is unchanged.

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
    ".tmp-build/**",
    // The copied `.mjs` guards: not linted (see above).
    "scripts/**",
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
        project: [
          "./tsconfig.json",
          "./ingest/tsconfig.json",
          "./tsconfig.tools.json",
        ],
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
