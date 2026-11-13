// Flat ESLint config: JS + TypeScript + Astro recommended rule sets.
//
// TypeScript support needs `typescript-eslint` (devDependency): the Astro
// plugin's parser delegates TS frontmatter and `.ts` files to it, and
// plain `.ts` files cannot be parsed by ESLint's default parser at all.
// No type-aware rules are enabled — `astro check` is the type checker.
import js from "@eslint/js";
import eslintPluginAstro from "eslint-plugin-astro";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    // Generated / vendored output is never linted.
    ignores: ["dist/**", ".astro/**", ".vercel/**", "node_modules/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...eslintPluginAstro.configs.recommended,
  {
    // Node scripts and config files run outside the browser.
    files: [
      "scripts/**/*.{js,mjs,cjs}",
      "*.config.{js,mjs,cjs}",
      "eslint.config.js",
    ],
    languageOptions: {
      globals: globals.node,
    },
  },
);
