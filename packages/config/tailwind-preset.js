/** @type {import('tailwindcss').Config} */
export const tailwindPreset = {
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#3730A3",
          50: "#EEF0FC",
          100: "#DCE0F9",
          300: "#8B94E0",
          500: "#4F46C7",
          700: "#3730A3",
          900: "#241E6B",
        },
        accent: {
          DEFAULT: "#F59E0B",
          100: "#FEF3C7",
          300: "#FCD34D",
          500: "#F59E0B",
          700: "#B45309",
        },
      },
      fontFamily: {
        sans: ["Inter", "Manrope", "system-ui", "sans-serif"],
      },
    },
  },
};
