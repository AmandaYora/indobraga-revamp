import { Skeleton } from "@/shared/components/ui/skeleton";

export function FacilitiesContentSkeleton() {
  return (
    <div role="status" aria-live="polite" className="mx-auto max-w-7xl space-y-8 px-4 py-12 sm:px-6">
      <span className="sr-only">Memuat fasilitas.</span>
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-4 sm:grid-cols-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
