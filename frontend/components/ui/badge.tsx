import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "zinc" | "green" | "red" | "amber" | "blue" | "purple";
};

const tones = {
  zinc: "border-white/20 bg-white/10 text-[#ffd9ba]",
  green: "border-emerald-400/30 bg-emerald-500/15 text-emerald-300",
  red: "border-red-400/30 bg-red-500/15 text-red-300",
  amber: "border-amber-400/30 bg-amber-500/15 text-amber-300",
  blue: "border-blue-400/30 bg-blue-500/15 text-blue-300",
  purple: "border-violet-400/30 bg-violet-500/15 text-violet-300"
};

export function Badge({ className, tone = "zinc", ...props }: BadgeProps) {
  return <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-medium backdrop-blur-sm", tones[tone], className)} {...props} />;
}
