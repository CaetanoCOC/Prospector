import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#F1F8F1",
        surface: "#FFFFFF",
        primary: {
          DEFAULT: "#388E3C",
          light: "#A5D6A7",
          dark: "#1B5E20",
        },
        accent: "#E8F5E9",
        ink: "#1B5E20",
        muted: "#757575",
        danger: "#CC3300",
        border: "rgba(56, 142, 60, 0.15)",
      },
      fontFamily: {
        sans: [
          "Inter Variable",
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        mono: ["Berkeley Mono", "ui-monospace", "SF Mono", "Menlo", "monospace"],
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
      boxShadow: {
        low: "0px 2px 4px rgba(0,0,0,0.06)",
        medium: "0px 4px 16px rgba(0,0,0,0.08)",
        high: "0px 8px 32px rgba(0,0,0,0.12)",
      },
      transitionTimingFunction: {
        "out-quad": "cubic-bezier(0.25,0.46,0.45,0.94)",
        "out-quint": "cubic-bezier(0.23,1,0.32,1)",
      },
    },
  },
  plugins: [],
};

export default config;
