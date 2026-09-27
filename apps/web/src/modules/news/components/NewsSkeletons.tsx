import { PageHero } from "@/shared/components/ui/page-hero";
import { ArticleDetailSkeleton, NewsGridSkeleton } from "@/modules/site/components/PublicSkeletons";
import { PAGE_HERO } from "@/modules/site/lib/page-copy";

export { ArticleDetailSkeleton, NewsGridSkeleton };

/** Port 1:1 `NewsPendingPage` di `routes/_public.berita.tsx` legacy. */
export function NewsPendingPage() {
  return (
    <>
      <PageHero {...PAGE_HERO.news} />
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <NewsGridSkeleton />
        </div>
      </section>
    </>
  );
}
