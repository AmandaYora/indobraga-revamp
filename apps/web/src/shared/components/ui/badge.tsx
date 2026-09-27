import type { HTMLAttributes } from "react";

/**
 * Tone = pasangan warna soft-tint yang dipakai `StatusBadge` legacy (`components/admin/ui.tsx`).
 * `warning` memakai token `warning-strong` (= `oklch(0.45 0.15 75)` yang di-hardcode legacy).
 */
export type BadgeTone = "primary" | "accent" | "success" | "warning" | "destructive" | "muted";

export const badgeToneClass: Record<BadgeTone, string> = {
  primary: "bg-primary/10 text-primary",
  accent: "bg-accent/20 text-accent-foreground",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning-strong",
  destructive: "bg-destructive/10 text-destructive",
  muted: "bg-muted text-muted-foreground",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

/**
 * Badge generik — domain-agnostic (aturan standar: shared UI tidak mengenal status domain).
 * Markup & kelas = span `StatusBadge` legacy; label + tone per status didefinisikan di peta status
 * tiap modul. Default tone `muted` = fallback legacy untuk status yang tidak dikenal.
 */
export function Badge({ className = "", tone = "muted", ...props }: BadgeProps) {
  return (
    <span
      {...props}
      className={`inline-flex max-w-full min-w-0 items-center justify-center rounded-full px-2.5 py-0.5 text-center text-xs font-semibold leading-tight whitespace-normal break-words ${badgeToneClass[tone]} ${className}`}
    />
  );
}
