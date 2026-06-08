import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "children"> {
  label?: string;
}

const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, id, label, disabled, checked, onChange, ...props }, ref) => {
    return (
      <label htmlFor={id} className={cn("inline-flex items-center gap-3 cursor-pointer", disabled && "cursor-not-allowed opacity-50", className)}>
        <span className="relative inline-flex h-5 w-9 shrink-0">
          <input
            ref={ref}
            id={id}
            type="checkbox"
            role="switch"
            disabled={disabled}
            checked={checked}
            onChange={onChange}
            className="peer sr-only"
            {...props}
          />
          <span className="absolute inset-0 rounded-full border border-border bg-input transition-colors peer-checked:bg-primary peer-checked:border-primary peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background" />
          <span
            className={cn(
              "absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-background shadow-sm transition-transform",
              "peer-checked:translate-x-4 peer-checked:bg-primary-foreground"
            )}
          />
        </span>
        {label && <span className="text-sm text-foreground select-none">{label}</span>}
      </label>
    );
  }
);
Switch.displayName = "Switch";

export { Switch };
