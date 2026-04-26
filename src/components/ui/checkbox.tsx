import { InputHTMLAttributes, forwardRef } from "react";import { cn } from "@/lib/utils";

export const Checkbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="checkbox"
        className={cn(
          "h-4 w-4 rounded border-slate-300 text-[#2bb6a3] focus:ring-[#2bb6a3]",
          className
        )}
        {...props}
      />
    );
  }
);
Checkbox.displayName = "Checkbox";
