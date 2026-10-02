/** @type {import('tailwindcss').Config} */
export default {
  // The shared UI primitives carry Tailwind classes too, so they are scanned as well.
  content: ["./index.html", "./src/**/*.{js,jsx}", "../../packages/shared/src/ui/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Inter Variable'", "Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      colors: {
        // The library's brand colour (from /branding) overrides these CSS variables.
        brand: {
          DEFAULT: "rgb(var(--brand) / <alpha-value>)",
          dark: "rgb(var(--brand-dark) / <alpha-value>)",
          light: "rgb(var(--brand-light) / <alpha-value>)",
        },
      },
    },
  },
  plugins: [],
};
