import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        coffee: {
          50: "#fdf6ec",
          100: "#f7efe5",
          500: "#5a342d",
          600: "#3b1f1a",
          700: "#2a140f"
        },
        ink: "#fff0df",
        surface: {
          base: "#120803",
          panel: "#1a0d08",
          elevated: "#221209"
        }
      },
      boxShadow: {
        panel: "0 8px 32px rgba(59, 31, 26, 0.12)",
        "panel-hover": "0 12px 40px rgba(59, 31, 26, 0.2)"
      },
      keyframes: {
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 16px 2px rgba(255,222,180,0.2)" },
          "50%": { boxShadow: "0 0 28px 6px rgba(255,222,180,0.4)" }
        },
        "glass-shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        }
      },
      animation: {
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        "glass-shimmer": "glass-shimmer 8s linear infinite"
      }
    }
  },
  plugins: []
};

export default config;
