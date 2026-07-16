import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

const globals = {
  AbortController: "readonly",
  console: "readonly",
  document: "readonly",
  fetch: "readonly",
  FormData: "readonly",
  localStorage: "readonly",
  location: "readonly",
  navigator: "readonly",
  process: "readonly",
  Response: "readonly",
  setTimeout: "readonly",
  URL: "readonly",
  URLSearchParams: "readonly",
  window: "readonly",
};

export default defineConfig([
  globalIgnores([
    ".next/**",
    "dist/**",
    "node_modules/**",
    "frontend/.astro/**",
    "frontend/dist/**",
    "frontend/node_modules/**",
    "_bmad/**",
    "_bmad-output/**",
    "app/**",
    "components/**",
    "db/**",
    "features/**",
    "lib/**",
    "next-env.d.ts",
  ]),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["scripts/**/*.mjs", "tests/go-astro-default.test.mjs", "frontend/src/**/*.ts"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals,
    },
  },
]);
