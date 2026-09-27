import { Link, useLoaderData, useSearchParams } from "react-router-dom";
import { OptionalImage } from "@/shared/components/ui/media-placeholder";
import { PageHero } from "@/shared/components/ui/page-hero";
import { useApiQuery } from "@/shared/hooks/useApiQuery";
import { formatDateId } from "@/shared/lib/date";
import type { ContractSchemas } from "@/shared/types/contract";
import { Seo } from "@/modules/site/components/Seo";
import { PublicErrorState } from "@/modules/site/components/PublicErrorState";
import { siteService, type PageList } from "@/modules/site/services/site.service";
import { NEWS_PAGE_SIZE, parseNewsPage } from "@/modules/site/services/public.loaders";
import { PAGE_HERO, PAGE_SEO } from "@/modules/site/lib/page-copy";
import { NewsGridSkeleton } from "@/modules/news/components/NewsSkeletons";

type PublicNewsItem = ContractSchemas["PublicNewsItem"];

const PAGER_LINK_CLASS =
  "rounded-lg border border-border px-4 py-2 text-sm font-semibold text-primary transition hover:border-primary/30 hover:bg-primary hover:text-primary-foreground";
const PAGER_DISABLED_CLASS =
  "rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted-foreground/60";

/**
 * Port 1:1 `NewsPage` di `routes/_public.berita.tsx` legacy: grid 6 per halaman, pagination
 * bernomor berupa `<Link href="/berita?page=N">` (bisa di-crawl).
 */
export default function NewsListPage() {
  const [searchParams] = useSearchParams();
  const page = parseNewsPage(searchParams.get("page"));
  const initialNews = useLoaderData() as PageList<PublicNewsItem> | null;
  const { data, error, loading, reload } = useApiQuery(
    ["public", "news", page],
    () => siteService.news({ page, limit: NEWS_PAGE_SIZE }),
    {
      initialData: initialNews,
      refetchOnMount: false,
    },
  );
  const totalPages = data?.meta?.total_pages ?? 1;
  const currentPage = Math.min(page, totalPages);
  const visibleNews = data?.items ?? [];
  const featuredNews = visibleNews[0];

  return (
    <>
      <Seo {...PAGE_SEO.news} />
      <PageHero {...PAGE_HERO.news} image={featuredNews?.thumbnail_url ?? undefined} />
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {error && <PublicErrorState error={error} onRetry={reload} />}
          {loading && !data ? (
            <NewsGridSkeleton />
          ) : visibleNews.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
              Belum ada berita yang dipublikasikan.
            </div>
          ) : (
            <>
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {visibleNews.map((n) => (
                  <Link
                    key={n.id}
                    to={`/berita/${n.slug}?page=${currentPage}`}
                    className="group overflow-hidden rounded-2xl bg-card shadow-card transition hover:-translate-y-1 hover:shadow-elegant"
                  >
                    <OptionalImage
                      src={n.thumbnail_url}
                      alt={n.title}
                      className="aspect-[16/10] w-full object-cover"
                      placeholderClassName="aspect-[16/10] w-full"
                    />
                    <div className="p-5">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="rounded-full bg-accent/20 px-2.5 py-0.5 font-semibold text-accent-foreground">
                          {n.category}
                        </span>
                        <span className="text-muted-foreground">
                          {formatDateId(n.published_at ?? "")}
                        </span>
                      </div>
                      <h3 className="mt-3 font-display text-lg font-bold">{n.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{n.excerpt}</p>
                    </div>
                  </Link>
                ))}
              </div>
              {totalPages > 1 && (
                <nav
                  aria-label="Pagination berita"
                  className="mt-10 flex flex-wrap items-center justify-center gap-2"
                >
                  {currentPage > 1 ? (
                    <Link to={`/berita?page=${currentPage - 1}`} className={PAGER_LINK_CLASS}>
                      Sebelumnya
                    </Link>
                  ) : (
                    <span className={PAGER_DISABLED_CLASS}>Sebelumnya</span>
                  )}
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
                    <Link
                      key={pageNumber}
                      to={`/berita?page=${pageNumber}`}
                      aria-current={currentPage === pageNumber ? "page" : undefined}
                      className={`flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-semibold transition ${
                        currentPage === pageNumber
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-primary hover:border-primary/30 hover:bg-primary hover:text-primary-foreground"
                      }`}
                    >
                      {pageNumber}
                    </Link>
                  ))}
                  {currentPage < totalPages ? (
                    <Link to={`/berita?page=${currentPage + 1}`} className={PAGER_LINK_CLASS}>
                      Berikutnya
                    </Link>
                  ) : (
                    <span className={PAGER_DISABLED_CLASS}>Berikutnya</span>
                  )}
                </nav>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
