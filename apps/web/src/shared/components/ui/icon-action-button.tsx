import type { ComponentType } from "react";
import { cn } from "@/shared/lib/cn";

type Tone = "default" | "primary" | "success" | "warning" | "danger" | "muted";

const toneClasses: Record<Tone, string> = {
  default: "border-input hover:bg-muted",
  primary: "border-primary/30 text-primary hover:bg-primary-soft",
  success: "border-success/30 text-success-strong hover:bg-success/10",
  warning: "border-warning/40 text-warning-strong hover:bg-warning/10",
  danger: "border-destructive/30 text-destructive hover:bg-destructive/10",
  muted: "border-transparent text-muted-foreground hover:bg-muted",
};

export function IconActionButton({
  label,
  tooltip,
  icon: Icon,
  tone = "default",
  className,
  ...props
}: {
  label: string;
  tooltip?: string;
  icon: ComponentType<{ className?: string }>;
  tone?: Tone;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <span className="group relative inline-flex" title={tooltip ?? label}>
      <button
        type="button"
        aria-label={label}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-full border bg-background transition-colors disabled:opacity-50",
          toneClasses[tone],
          className,
        )}
        {...props}
      >
        <Icon className="h-4 w-4" />
      </button>
      {tooltip ? (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-primary-deep px-2 py-1 text-xs text-white group-hover:block"
        >
          {tooltip}
        </span>
      ) : null}
    </span>
  );
}
