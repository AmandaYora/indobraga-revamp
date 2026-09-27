import { PageHero } from "@/shared/components/ui/page-hero";
import { PortfolioGridSkeleton } from "@/modules/site/components/PublicSkeletons";
import { PAGE_HERO } from "@/modules/site/lib/page-copy";

export { PortfolioGridSkeleton };

/** Port 1:1 `PortfolioPendingPage` di `routes/_public.portfolio.tsx` legacy. */
export function PortfolioPendingPage() {
  return (
    <>
      <PageHero {...PAGE_HERO.portfolio} />
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <PortfolioGridSkeleton />
        </div>
      </section>
    </>
  );
}
