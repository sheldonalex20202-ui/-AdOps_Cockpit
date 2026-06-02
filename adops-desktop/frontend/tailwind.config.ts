import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Geist Variable", "system-ui", "sans-serif"],
        mono: ["Geist Mono Variable", "ui-monospace", "monospace"],
      },
      colors: {
        surface:    "var(--surface)",
        panel:      "var(--panel)",
        card:       "var(--card)",
        raised:     "var(--raised)",
        selected:   "var(--selected)",
        stroke:     "var(--stroke)",
        ink:        "var(--ink)",
        muted:      "var(--muted)",
        brand:      "var(--brand)",
        "brand-dim":"var(--brand-dim)",
        "brand-fg": "var(--brand-fg)",
        danger:     "var(--danger)",
        success:    "var(--success)",
        warn:       "var(--warn)",
        info:       "var(--info)",
        subtle:     "var(--subtle)",
        "brand-soft": "var(--brand-soft)",
        // legacy aliases
        line:       "var(--stroke)",
        field:      "var(--card)",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.08)",
        panel: "0 0 0 1px var(--stroke)",
      },
    },
  },
  plugins: [],
};

export default config;
