import type { ButtonHTMLAttributes, ReactNode } from "react";

/* Port 1:1 `IconActionButton` + tooltip & `ActionButtonGroup` di `components/admin/ui.tsx` legacy. */

export type IconActionTone = "default" | "primary" | "success" | "warning" | "danger" | "muted";

const iconActionToneClass: Record<IconActionTone, string> = {
  default: "text-foreground hover:bg-secondary",
  primary: "text-primary hover:bg-primary-soft",
  success: "text-success hover:bg-success/10",
  warning: "text-warning-strong hover:bg-warning/15",
  danger: "text-destructive hover:bg-destructive/10",
  muted: "text-muted-foreground hover:bg-secondary hover:text-foreground",
};

export function ActionButtonGroup({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>{children}</div>;
}

export function IconActionButton({
  label,
  tooltip,
  icon,
  tone = "default",
  className = "",
  type = "button",
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "aria-label"> & {
  label: string;
  tooltip?: string;
  icon: ReactNode;
  tone?: IconActionTone;
}) {
  const tooltipText = tooltip ?? label;

  return (
    <span className="group relative inline-flex">
      <button
        {...props}
        type={type}
        aria-label={label}
        title={tooltipText}
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50 ${iconActionToneClass[tone]} ${className}`}
      >
        {icon}
      </button>
      <span
        role="tooltip"
        className="pointer-events-none invisible absolute bottom-full right-0 z-30 mb-2 whitespace-nowrap rounded-md bg-primary-deep px-2 py-1 text-xs font-semibold leading-tight text-primary-foreground opacity-0 shadow-card transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
      >
        {tooltipText}
      </span>
    </span>
  );
}
