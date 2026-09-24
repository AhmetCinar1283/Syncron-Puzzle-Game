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
    // Native/desktop build artifacts
    "android/**",
    "dist-electron/**",
    // Portal build çıktıları (npm run build:crazygames / build:gamedistribution)
    "out-crazygames/**",
    "out-gamedistribution/**",
    // Tanıtım videosu: kendi bağımlılıkları ve tsconfig'i olan ayrı Remotion projesi.
    "video/**",
  ]),
]);

export default eslintConfig;
