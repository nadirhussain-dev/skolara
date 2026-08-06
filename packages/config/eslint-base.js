import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";

export const ignores = [
  "dist/**",
  ".next/**",
  ".turbo/**",
  ".expo/**",
  "node_modules/**",
  "coverage/**",
];

/** Plain TypeScript — no framework globals. */
export const baseConfig = tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  { ignores },
);

/** Node.js services (NestJS, scripts). */
export const nodeConfig = tseslint.config(...baseConfig, {
  languageOptions: { globals: globals.node },
});

/** React — browser + Node globals (SSR-aware), react/react-hooks rules. */
export const reactConfig = tseslint.config(...baseConfig, {
  plugins: { react: reactPlugin, "react-hooks": reactHooksPlugin },
  languageOptions: {
    globals: { ...globals.browser, ...globals.node },
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
  rules: {
    ...reactPlugin.configs.flat.recommended.rules,
    ...reactHooksPlugin.configs.recommended.rules,
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
  },
  settings: { react: { version: "detect" } },
});
