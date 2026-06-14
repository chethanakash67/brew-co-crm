/**
 * Design System Tokens — Brew & Co. CRM
 *
 * All components should import from here instead of hardcoding values.
 */

export const tokens = {
  colors: {
    /** App-level backgrounds */
    background: {
      base: "#120803",
      gradient: "linear-gradient(135deg, #f5e6d3, #e8d5c0)",
    },
    /** Primary brown scale */
    primary: {
      main: "#3b1f1a",
      light: "#5a342d",
      dark: "#2a140f",
    },
    /** Cream / warm-white accents */
    accent: {
      cream: "#fdf6ec",
      soft: "#f7efe5",
    },
    /** Text hierarchy — warmest → most muted */
    text: {
      heading: "#fff0df",
      body: "#ffe9d5",
      secondary: "#ffd9ba",
      muted: "#ffd1ae",
      faint: "#ffc89e",
    },
    /** Surface tones for panels & drawers */
    surface: {
      panel: "#1a0d08",
      elevated: "#221209",
    },
  },

  /** Pre-composed Tailwind class-strings for glass effects */
  glass: {
    card: "rounded-[16px] border border-white/12 bg-white/6 backdrop-blur-xl shadow-[0_8px_32px_rgba(59,31,26,0.12)]",
    sidebar:
      "bg-white/5 backdrop-blur-xl border-r border-white/10",
    input:
      "rounded-[12px] border border-white/15 bg-white/8 backdrop-blur-sm text-[#fff0df] placeholder:text-[#ffd1ae]/50 focus:border-amber-500/40 focus:ring-2 focus:ring-amber-500/10",
    badge:
      "backdrop-blur-sm rounded-full border px-2.5 py-1 text-xs font-medium",
    modal:
      "rounded-[20px] border border-white/12 bg-[#1a0d08]/95 backdrop-blur-xl shadow-[0_20px_60px_rgba(8,4,2,0.5)]",
    tableHeader:
      "border-b border-white/10 bg-white/5 text-xs uppercase tracking-wide text-[#ffd1ae]/78",
    tableRow:
      "bg-transparent transition hover:bg-white/6",
    tableDivider: "divide-y divide-white/8",
  },

  /** Box-shadow presets */
  shadows: {
    panel:
      "0 8px 32px rgba(59, 31, 26, 0.12)",
    hover:
      "0 12px 40px rgba(59, 31, 26, 0.2)",
    modal:
      "0 20px 60px rgba(8, 4, 2, 0.5)",
  },

  /** Border-radius scale */
  radii: {
    sm: "rounded-[8px]",
    md: "rounded-[12px]",
    lg: "rounded-[16px]",
    xl: "rounded-[20px]",
    pill: "rounded-full",
  },
} as const;
