import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const controlClass =
  "h-10 w-full rounded-[12px] border border-white/15 bg-white/8 px-3 text-sm text-[#fff0df] outline-none backdrop-blur-sm transition placeholder:text-[#ffd1ae]/50 focus:border-amber-500/40 focus:ring-2 focus:ring-amber-500/10";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlClass, className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(controlClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-[104px] w-full rounded-[12px] border border-white/15 bg-white/8 px-3 py-2 text-sm text-[#fff0df] outline-none backdrop-blur-sm transition placeholder:text-[#ffd1ae]/50 focus:border-amber-500/40 focus:ring-2 focus:ring-amber-500/10",
        className
      )}
      {...props}
    />
  );
}
