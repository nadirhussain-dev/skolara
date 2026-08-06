import { baseConfig } from "@skolara/config/eslint-base.js";
import globals from "globals";

export default [
  ...baseConfig,
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
];
