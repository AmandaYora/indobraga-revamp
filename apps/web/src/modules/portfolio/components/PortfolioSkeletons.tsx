import { Skeleton } from "@/shared/components/ui/skeleton";

export function PortfolioGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div role="status" aria-live="polite" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <span className="sr-only">Memuat portofolio.</span>
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className="aspect-[4/3]" />
      ))}
    </div>
  );
}
