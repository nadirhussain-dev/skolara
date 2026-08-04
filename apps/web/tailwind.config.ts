import type { Config } from "tailwindcss";
import { tailwindPreset } from "@skolara/config/tailwind-preset.js";

const config: Config = {
  presets: [tailwindPreset as Config],
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
};

export default config;
