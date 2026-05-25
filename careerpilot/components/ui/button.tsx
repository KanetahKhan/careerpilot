import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "default" | "lg";
  variant?: "primary" | "ghost" | "outline";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, size = "default", variant = "primary", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none",
          size === "sm" && "px-3 py-1.5 text-xs",
          size === "default" && "px-4 py-2.5",
          size === "lg" && "px-6 py-3 text-base",
          variant === "primary" && "bg-primary text-primary-foreground font-semibold hover:opacity-90 active:scale-[0.98] shadow-lg shadow-primary/25",
          variant === "outline" && "border border-border bg-background/50 text-foreground hover:bg-secondary/80",
          variant === "ghost" && "text-muted-foreground hover:text-foreground hover:bg-secondary",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
