import { PageHero } from "@/shared/components/ui/page-hero";
import { GalleryGridSkeleton } from "@/modules/site/components/PublicSkeletons";
import { PAGE_HERO } from "@/modules/site/lib/page-copy";

export { GalleryGridSkeleton };

/** Port 1:1 `GalleryPendingPage` di `routes/_public.galeri.tsx` legacy. */
export function GalleryPendingPage() {
  return (
    <>
      <PageHero {...PAGE_HERO.gallery} />
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <GalleryGridSkeleton />
      </section>
    </>
  );
}
