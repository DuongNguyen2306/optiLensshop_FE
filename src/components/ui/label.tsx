import { LabelHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Label({ className, children, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("text-xs font-bold uppercase tracking-wide text-slate-800", className)} {...props}>
      {children}
    </label>
  );
}
