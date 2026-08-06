/** @type {import('tailwindcss').Config} */
export const tailwindPreset = {
  theme: {
    extend: {
      colors: {
        // Deep violet — primary brand hue.
        brand: {
          DEFAULT: "#6D28D9",
          50: "#F5F3FF",
          100: "#EDE9FE",
          200: "#DDD6FE",
          300: "#C4B5FD",
          400: "#A78BFA",
          500: "#8B5CF6",
          600: "#7C3AED",
          700: "#6D28D9",
          800: "#5B21B6",
          900: "#4C1D95",
        },
        // Coral — accent/CTA hue, used sparingly against the violet brand.
        accent: {
          DEFAULT: "#FB7185",
          50: "#FFF1F2",
          100: "#FFE4E6",
          200: "#FECDD3",
          300: "#FDA4AF",
          400: "#FB7185",
          500: "#FB7185",
          600: "#F43F5E",
          700: "#BE123C",
          800: "#9F1239",
          900: "#7A0E2E",
        },
        // Amber — kept distinct from the coral accent so "warning" status never
        // reads as "danger" next to it.
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
        sans: ["Inter", "Manrope", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 8px 30px -8px rgba(109, 40, 217, 0.35)",
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px -12px rgba(15, 23, 42, 0.10)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #6D28D9 0%, #8B5CF6 55%, #A78BFA 100%)",
        "coral-gradient": "linear-gradient(135deg, #FB7185 0%, #F43F5E 100%)",
      },
    },
  },
};
