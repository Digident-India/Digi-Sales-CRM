/**
 * Shared ESLint config for every Digident frontend repo (see docs/CODING_STANDARDS.md).
 * This file is identical in all repos: change it everywhere at once.
 * Readability rules start as "warn" so legacy code can be fixed phase by phase; switch a rule to
 * "error" once a repo has zero warnings for it.
 */
import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig, globalIgnores } from "eslint/config";

const MAX_FILE_LINES = 300;
const MAX_FUNCTION_LINES = 40;
const MAX_NESTING_DEPTH = 3;
const MIN_NAME_LENGTH = 2;

export default defineConfig([
  globalIgnores(["dist", "build", "coverage", "node_modules", "public"]),
  {
    files: ["**/*.{js,jsx}"],
    extends: [js.configs.recommended],
    plugins: { react, "react-hooks": reactHooks },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: "detect" } },
    rules: {
      // Correctness
      "react/jsx-uses-vars": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "no-unused-vars": [
        "warn",
        { args: "after-used", ignoreRestSiblings: true, caughtErrors: "none" },
      ],
      "no-empty": ["warn", { allowEmptyCatch: false }],

      // Readability (CODING_STANDARDS.md sections 1, 2, 5, 6)
      "no-console": "warn",
      "max-lines": ["warn", { max: MAX_FILE_LINES, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": [
        "warn",
        { max: MAX_FUNCTION_LINES, skipBlankLines: true, skipComments: true, IIFEs: true },
      ],
      "max-depth": ["warn", MAX_NESTING_DEPTH],
      "no-nested-ternary": "warn",
      "no-magic-numbers": [
        "warn",
        {
          ignore: [-1, 0, 1, 2, 100],
          ignoreArrayIndexes: true,
          ignoreDefaultValues: true,
          ignoreClassFieldInitialValues: true,
          enforceConst: true,
        },
      ],
      "id-length": ["warn", { min: MIN_NAME_LENGTH, exceptions: ["i", "_"], properties: "never" }],
    },
  },
  {
    // Constants files exist to name numbers; tests and tooling may use literals freely.
    files: ["src/constants/**", "**/*.test.{js,jsx}", "*.config.{js,mjs}", "scripts/**"],
    languageOptions: { globals: { ...globals.browser, ...globals.node, ...globals.vitest } },
    rules: { "no-magic-numbers": "off", "max-lines-per-function": "off", "no-console": "off" },
  },
]);
