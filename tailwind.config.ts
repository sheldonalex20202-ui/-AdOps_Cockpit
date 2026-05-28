import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        // Existing aliases kept for (app) pages
        ink:   "#f4f4f5",
        field: "#18181b",
        line:  "#27272a",
        pine:  "#3b82f6",
        amber: "#f59e0b",
        brick: "#ef4444",
        mint:  "#bbf7d0",
      },
      boxShadow: {
        cockpit: "0 0 0 1px #27272a",
      },
    },
  },
  plugins: [],
};

export default config;
