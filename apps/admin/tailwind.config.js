/** @type {import('tailwindcss').Config} */
export default {
  // The shared UI primitives carry Tailwind classes too, so they are scanned as well.
  content: ["./index.html", "./src/**/*.{js,jsx}", "../../packages/shared/src/ui/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Library branding (milestone 2) overrides these CSS variables at runtime.
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
