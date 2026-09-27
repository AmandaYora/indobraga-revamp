import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/lib/cn";

export function GalleryGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div role="status" aria-live="polite" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <span className="sr-only">Memuat galeri.</span>
      {Array.from({ length: count }, (_, index) => (
        <Skeleton
          key={index}
          className={cn(index % 7 === 0 && "row-span-2 sm:col-span-2", "aspect-square")}
        />
      ))}
    </div>
  );
}
