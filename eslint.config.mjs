import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Not source: the exported site and downloaded vendor bundles. Linting these
    // produced thousands of findings in minified one-liners.
    "_next/**",
    "public/**",
    "**/*.min.js",
  ]),
]);

export default eslintConfig;
