import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", type = "button", ...props }, ref) => {
    const variants = {
      default: "bg-[#2bb6a3] text-white hover:brightness-[0.98] shadow-sm",
      outline:
        "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
      ghost: "text-slate-600 hover:bg-slate-100",
    };
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-60",
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
