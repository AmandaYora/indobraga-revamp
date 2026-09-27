import type { HTMLAttributes, ReactNode } from "react";

/**
 * Kartu admin — port 1:1 `Card` di `components/admin/ui.tsx` legacy.
 * Kelas digabung dengan string biasa (seperti legacy, bukan tailwind-merge) agar daftar kelas
 * dan hasil CSS identik; mis. `className="p-0"` berperilaku sama persis seperti di legacy.
 */
export function Card({
  children,
  className = "",
  ...props
}: { children: ReactNode; className?: string } & Omit<
  HTMLAttributes<HTMLDivElement>,
  "children" | "className"
>) {
  return (
    <div
      {...props}
      className={`min-w-0 rounded-xl border border-border bg-card p-4 shadow-card sm:rounded-2xl sm:p-5 ${className}`}
    >
      {children}
    </div>
  );
}
