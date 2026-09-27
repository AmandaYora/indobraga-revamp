import { PageHero } from "@/shared/components/ui/page-hero";
import { FacilitiesContentSkeleton } from "@/modules/site/components/PublicSkeletons";
import { PAGE_HERO } from "@/modules/site/lib/page-copy";

export { FacilitiesContentSkeleton };

/** Port 1:1 `FacilitiesPendingPage` di `routes/_public.fasilitas.tsx` legacy. */
export function FacilitiesPendingPage() {
  return (
    <>
      <PageHero {...PAGE_HERO.facilities} />
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FacilitiesContentSkeleton />
        </div>
      </section>
    </>
  );
}
