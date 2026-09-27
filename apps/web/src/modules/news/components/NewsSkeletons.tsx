import { Skeleton } from "@/shared/components/ui/skeleton";

export function NewsGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div role="status" aria-live="polite" className="grid gap-4 md:grid-cols-3">
      <span className="sr-only">Memuat berita.</span>
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className="aspect-[16/9]" />
      ))}
    </div>
  );
}

export function ArticleDetailSkeleton() {
  return (
    <div role="status" aria-live="polite" className="mx-auto max-w-3xl space-y-4 px-4 py-16">
      <span className="sr-only">Memuat detail berita.</span>
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="aspect-[16/9] w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-4/6" />
    </div>
  );
}
