import type { ReactNode } from "react";

/** Judul halaman admin — port 1:1 `PageTitle` di `components/admin/ui.tsx` legacy. */
export function PageTitle({
  title,
  desc,
  action,
}: {
  title: string;
  desc?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex min-w-0 flex-wrap items-start justify-between gap-3 sm:items-end">
      <div className="min-w-0 flex-1">
        <h1 className="text-anywhere font-display text-2xl font-bold text-primary-deep sm:text-3xl">
          {title}
        </h1>
        {desc && (
          <p className="text-anywhere mt-1 max-w-3xl text-sm text-muted-foreground">{desc}</p>
        )}
      </div>
      {action && <div className="flex w-full min-w-0 sm:w-auto sm:justify-end">{action}</div>}
    </div>
  );
}

/** Satu-satunya kartu admin ada di `./card`; di-re-export agar import lama tetap valid. */
export { Card } from "./card";
