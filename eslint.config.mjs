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
    "registration-console/**",
    "next-env.d.ts",
    // The standalone voxel engine and its build scripts are plain ESM JS,
    // bundled by esbuild outside the Next build. Not part of the app graph.
    "engine/**",
    "scripts/**",
    "public/prismarine/**",
  ]),
]);

export default eslintConfig;
