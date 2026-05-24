import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // "Mission control" — deep ink with warm coral/amber signal accents.
        ink: {
          900: "#0B0E14", // page
          800: "#11151F", // panel
          700: "#171C28", // raised
          600: "#222838", // border
          500: "#2E3650",
        },
        signal: {
          DEFAULT: "#FF6B4A", // coral — primary action / brand
          soft: "#FF8A6E",
          glow: "#FF6B4A33",
        },
        amber: { DEFAULT: "#FFB23E", soft: "#FFC76B" },
        mint: { DEFAULT: "#3DD9A0", soft: "#7BE9C2" },
        sky: { DEFAULT: "#5AA9E6", soft: "#8FC8F0" },
        chalk: { DEFAULT: "#E8EAF0", dim: "#9AA0B4", faint: "#5C6378" },
      },
      fontFamily: {
        // Distinctive: a grotesque display + a humanist mono for data.
        display: ["var(--font-display)", "ui-sans-serif", "system-ui"],
        body: ["var(--font-body)", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px #FF6B4A33, 0 8px 40px -12px #FF6B4A55",
        panel: "0 1px 0 0 #ffffff08 inset, 0 20px 50px -20px #00000080",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseGlow: {
          "0%,100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.2,0.8,0.2,1) both",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
