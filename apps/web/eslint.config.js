import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import jsxA11y from "eslint-plugin-jsx-a11y";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "coverage", "src/mocks/seed", "public/mockServiceWorker.js"] },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
  {
    // File definisi route berisi objek konfigurasi, bukan komponen — aturan fast refresh tidak relevan.
    files: ["src/app/routes/**/*.{ts,tsx}"],
    rules: { "react-refresh/only-export-components": "off" },
  },
  {
    // Store, test, barrel, & pola shadcn (varian + komponen satu file).
    files: [
      "src/**/stores/*.ts",
      "src/**/*.test.{ts,tsx}",
      "src/test/**/*.{ts,tsx}",
      "src/shared/components/ui/*.{ts,tsx}",
      "src/**/index.ts",
    ],
    rules: { "react-refresh/only-export-components": "off" },
  },
  {
    // Skrip Node (config, converter fixture).
    files: ["*.config.{ts,js}", "scripts/**/*.{ts,mjs,js}"],
    languageOptions: { globals: globals.node },
    rules: { "react-hooks/rules-of-hooks": "off" },
  },
);
