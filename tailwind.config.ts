import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0B0B0A",
        card: "#17161A",
        gold: "#C9A84C",
        foreground: "#F2EDE4",
        muted: "#9A958C",
      },
      // Tailwind 3 only generates opacity modifiers from this scale, so
      // white/6, /8 and /12 produced no CSS (STAGE1-REPORT §8.3).
      opacity: {
        6: "0.06",
        8: "0.08",
        12: "0.12",
      },
      fontFamily: {
        cormorant: ["var(--font-cormorant)", "Georgia", "serif"],
        inter: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
