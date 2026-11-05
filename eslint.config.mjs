// ESLint for Naive's own code (handoff 2026-10-29, item 5): the recommended rules over .mjs, .js, .jsx, .ts and .tsx.
//
//   npm run lint
//
// Rules that fail across many files today are turned off below with a dated TODO, so the lint passes
// now and each rule can be switched back on in its own change.

import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    // `.lake` is Lake's build cache (Mathlib under lean/). It is not Naive's code.
    ignores: ["**/node_modules/**", "**/.next/**", "**/.source/**", "**/_catalog/**", "**/.naive/**", "**/.lake/**", "**/next-env.d.ts"],
  },
  {
    files: ["**/*.{mjs,js,cjs,jsx}"],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node, ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" }],
    },
  },
  {
    // Espree's scope analysis does not count a JSX tag as a use, so a component used only as a tag reads as
    // unused. typescript-eslint's parser counts it.
    files: ["**/*.jsx"],
    languageOptions: { parser: tseslint.parser },
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: { "@typescript-eslint/no-unused-vars": "warn" },
  },
  {
    rules: {
      // TODO(2026-10-29): 35 unused variables and imports across interface/, schema/ and site/. Back to "error" once
      // they are removed; they are warnings so parallel branches touching those files do not conflict.
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" }],
      // Empty catch blocks are the house idiom for "best effort" reads; other empty blocks still fail.
      "no-empty": ["error", { allowEmptyCatch: true }],
      // TODO(2026-10-29): the \x00/\x01 separators in router.mjs, access.mjs and model-steps.mjs are deliberate.
      // Replace them with a named constant and turn this back on.
      "no-control-regex": "off",
    },
  },
);
