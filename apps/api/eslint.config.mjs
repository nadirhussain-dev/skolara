import { nodeConfig } from "@skolara/config/eslint-base.js";

export default [
  ...nodeConfig,
  { ignores: ["prisma/migrations/**"] },
];
