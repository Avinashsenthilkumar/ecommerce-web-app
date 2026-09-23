import type { Config } from "tailwindcss";

// Tokens sampled from the subsel prototype
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // themeable via CSS variables set from admin settings (src/lib/settings.ts)
        ink: "rgb(var(--c-ink) / <alpha-value>)", // text and primary buttons
        slate: "#78716C", // secondary text
        mist: "rgb(var(--c-mist) / <alpha-value>)", // warm panels
        paper: "rgb(var(--c-paper) / <alpha-value>)", // page background
        line: "rgb(var(--c-line) / <alpha-value>)", // hairline borders
        pine: "rgb(var(--c-pine) / <alpha-value>)", // accent / discounts
        pineSoft: "rgb(var(--c-pine) / 0.12)",
        sale: "#B42318", // errors
        amber: "#B7791F",
        amberSoft: "#F6EBD5",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      maxWidth: { shell: "1400px" },
      borderRadius: { card: "28px" },
    },
  },
  plugins: [],
};
export default config;
