/**
 * Brand steps read CSS variables so a school's own colour can replace the
 * Skolara default at runtime (see `brandCssVariables` in @skolara/utils and
 * the SchoolTheme component in apps/web). The fallback channels are the
 * default indigo scale, so anything rendered outside a themed tree — or
 * before the variables are defined — still looks right.
 *
 * Channels rather than hex so opacity modifiers (`bg-brand-700/40`) work.
 */
const brandStep = (step, fallback) => `rgb(var(--brand-${step}, ${fallback}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export const tailwindPreset = {
  theme: {
    extend: {
      colors: {
        // Indigo by default; themeable per school.
        brand: {
          DEFAULT: brandStep(700, "55 48 163"),
          50: brandStep(50, "241 241 249"),
          100: brandStep(100, "227 226 242"),
          200: brandStep(200, "199 197 229"),
          300: brandStep(300, "165 162 214"),
          400: brandStep(400, "127 123 196"),
          500: brandStep(500, "95 89 181"),
          600: brandStep(600, "71 65 170"),
          700: brandStep(700, "55 48 163"),
          800: brandStep(800, "45 39 134"),
          900: brandStep(900, "33 29 98"),
        },
        // Amber — highlights only: fee due, unread, achievement. Never themed,
        // and text on it is always dark (white on amber fails contrast).
        accent: {
          DEFAULT: "#F59E0B",
          50: "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
          800: "#92400E",
          900: "#78350F",
        },
        // Same amber ramp under its semantic name, for "pending"/"late" states.
        warning: {
          DEFAULT: "#F59E0B",
          50: "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
          800: "#92400E",
          900: "#78350F",
        },
      },
      fontFamily: {
        sans: ["Manrope", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        glow: "0 8px 24px -12px rgb(var(--brand-700, 55 48 163) / 0.55)",
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px -12px rgba(15, 23, 42, 0.10)",
      },
      backgroundImage: {
        // Kept as utilities because pages reference them, but flat now: the
        // design system has no gradients. New code should use `bg-brand-700`
        // and `bg-accent-500` directly.
        "brand-gradient":
          "linear-gradient(rgb(var(--brand-700, 55 48 163)), rgb(var(--brand-700, 55 48 163)))",
        "coral-gradient": "linear-gradient(#F59E0B, #F59E0B)",
      },
    },
  },
};
