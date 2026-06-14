import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

const variants = {
  primary: "bg-gradient-to-r from-amber-700/80 to-amber-600/80 text-[#fff0df] border border-amber-500/30 backdrop-blur-sm hover:from-amber-600/90 hover:to-amber-500/90",
  secondary: "border border-white/20 bg-white/8 text-[#ffd9ba] backdrop-blur-sm hover:bg-white/14",
  ghost: "text-[#ffd1ae] hover:bg-white/8",
  danger: "bg-red-600/80 text-white border border-red-500/30 hover:bg-red-500/90"
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-[12px] px-4 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
