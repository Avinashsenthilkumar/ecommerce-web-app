import type { Config } from "tailwindcss";

// Tokens sampled from the subsel prototype
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1C1917", // near-black text and primary buttons
        slate: "#78716C", // secondary text
        mist: "#F1EEE9", // warm panels (fulfilment block, selected options)
        paper: "#FAF8F5", // page background
        line: "#E7E2DA", // hairline borders
        pine: "#3F7D58", // discount green / success
        pineSoft: "#E4EFE7",
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
