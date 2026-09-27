import { Skeleton } from "@/shared/components/ui/skeleton";

export function HomePendingPage() {
  return (
    <div role="status" aria-live="polite" className="animate-fade-in">
      <span className="sr-only">Memuat beranda.</span>
      <Skeleton className="h-[420px] w-full rounded-none" />
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-12 sm:px-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    </div>
  );
}
