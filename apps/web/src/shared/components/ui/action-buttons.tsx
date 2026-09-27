import type { ButtonHTMLAttributes } from "react";

/* Port 1:1 `PrimaryButton` & `GhostButton` di `components/admin/ui.tsx` legacy. */

export function PrimaryButton({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex max-w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-center text-sm font-semibold leading-tight text-primary-foreground shadow-card transition hover:bg-primary-deep ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex max-w-full items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-center text-sm font-semibold leading-tight text-foreground transition hover:bg-secondary ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}
