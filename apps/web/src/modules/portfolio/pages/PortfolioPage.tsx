import { useMemo, useState } from "react";
import { useLoaderData } from "react-router-dom";
import { Images } from "lucide-react";
import { OptionalImage } from "@/shared/components/ui/media-placeholder";
import { PageHero } from "@/shared/components/ui/page-hero";
import { useApiQuery } from "@/shared/hooks/useApiQuery";
import type { ContractSchemas } from "@/shared/types/contract";
import { Seo } from "@/modules/site/components/Seo";
import { PublicErrorState } from "@/modules/site/components/PublicErrorState";
import { siteService } from "@/modules/site/services/site.service";
import { PORTFOLIO_LIMIT, type PortfolioLoaderData } from "@/modules/site/services/public.loaders";
import { PAGE_HERO, PAGE_SEO } from "@/modules/site/lib/page-copy";
import { PortfolioModal } from "@/modules/portfolio/components/PortfolioModal";
import { PortfolioGridSkeleton } from "@/modules/portfolio/components/PortfolioSkeletons";

type PublicPortfolioItem = ContractSchemas["PublicPortfolioItem"];

const PORTFOLIO_BATCH_SIZE = 8;
const ALL_CATEGORIES = "all";

/**
 * Port 1:1 `PortfolioPage` di `routes/_public.portfolio.tsx` legacy: chip kategori mengambil
 * ulang list dari server per `category_slug`, tampil 8 per batch, "Muat lagi" membuka item yang
 * sudah diambil lalu cursor berikutnya (dalam kategori aktif), modal carousel.
 */
export default function PortfolioPage() {
  const initialData = useLoaderData() as PortfolioLoaderData;
  const [activeSlug, setActiveSlug] = useState(ALL_CATEGORIES);
  const [visibleCount, setVisibleCount] = useState(PORTFOLIO_BATCH_SIZE);
  const [selected, setSelected] = useState<PublicPortfolioItem | null>(null);
  const categoriesQuery = useApiQuery(
    ["public", "portfolio-categories"],
    () => siteService.portfolioCategories(),
    {
      initialData: initialData.categories,
      refetchOnMount: false,
    },
  );
  const categories = useMemo(
    () => categoriesQuery.data?.items ?? [],
    [categoriesQuery.data?.items],
  );
  const categorySlug = activeSlug === ALL_CATEGORIES ? undefined : activeSlug;
  const { data, error, loading, reload, setData } = useApiQuery(
    ["public", "portfolio", activeSlug],
    () => siteService.portfolio({ limit: PORTFOLIO_LIMIT, category_slug: categorySlug }),
    {
      initialData: activeSlug === ALL_CATEGORIES ? initialData.portfolio : null,
      refetchOnMount: false,
    },
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const list = useMemo(() => data?.items ?? [], [data?.items]);
  const visibleList = list.slice(0, visibleCount);
  // Masih ada item bila item yang sudah diambil belum semua tampil, atau server punya halaman lagi.
  const hasMoreItems = visibleCount < list.length || Boolean(data?.meta?.has_more);

  const loadMore = async () => {
    // Tampilkan dulu item yang sudah diambil.
    if (visibleCount < list.length) {
      setVisibleCount((count) => Math.min(count + PORTFOLIO_BATCH_SIZE, list.length));
      return;
    }
    // Selain itu ambil halaman cursor berikutnya dari server lalu gabungkan.
    const nextCursor = data?.meta?.next_cursor;
    if (!nextCursor || loadingMore) {
      return;
    }
    setLoadingMore(true);
    try {
      const page = await siteService.portfolio({
        limit: PORTFOLIO_LIMIT,
        category_slug: categorySlug,
        cursor: nextCursor,
      });
      setData((prev) =>
        prev
          ? {
              items: [...prev.items, ...page.items],
              meta: page.meta,
            }
          : page,
      );
      setVisibleCount((count) => count + PORTFOLIO_BATCH_SIZE);
    } finally {
      setLoadingMore(false);
    }
  };
  const featuredPortfolio = list[0];
  const categoryError = categoriesQuery.error;
  const filterOptions = useMemo(
    () =>
      categories.length > 0
        ? [{ slug: ALL_CATEGORIES, name: "Semua" }, ...categories.map((item) => item)]
        : [],
    [categories],
  );

  // Kategori aktif tidak ada lagi di daftar → kembali ke "Semua" (adjust during render).
  if (
    activeSlug !== ALL_CATEGORIES &&
    categories.length > 0 &&
    !categories.some((category) => category.slug === activeSlug)
  ) {
    setActiveSlug(ALL_CATEGORIES);
  }

  const selectCategory = (slug: string) => {
    setActiveSlug(slug);
    setVisibleCount(PORTFOLIO_BATCH_SIZE);
  };

  const retry = () => {
    reload();
    categoriesQuery.reload();
  };

  return (
    <>
      <Seo {...PAGE_SEO.portfolio} />
      <PageHero
        {...PAGE_HERO.portfolio}
        image={featuredPortfolio?.medium_url ?? featuredPortfolio?.thumbnail_url ?? undefined}
      />
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {(error || categoryError) && (
            <PublicErrorState error={error ?? categoryError} onRetry={retry} />
          )}
          {filterOptions.length > 0 && (
            <div className="flex min-w-0 flex-wrap gap-2">
              {filterOptions.map((category) => (
                <button
                  key={category.slug}
                  type="button"
                  onClick={() => selectCategory(category.slug)}
                  className={`max-w-full rounded-full px-4 py-2 text-sm font-semibold leading-tight transition ${
                    activeSlug === category.slug
                      ? "bg-primary text-primary-foreground shadow-card"
                      : "bg-secondary text-secondary-foreground hover:bg-primary-soft"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          )}
          {loading && !data ? (
            <PortfolioGridSkeleton />
          ) : list.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
              Belum ada portofolio yang dipublikasikan untuk kategori ini.
            </div>
          ) : (
            <>
              <div className="mt-10 grid min-w-0 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {visibleList.map((p) => {
                  const imageCount = p.images?.length ?? 0;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelected(p)}
                      aria-label={`Lihat detail ${p.title}`}
                      className="group w-full overflow-hidden rounded-2xl bg-card text-left shadow-card transition hover:-translate-y-1 hover:shadow-elegant focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                        <OptionalImage
                          src={p.medium_url ?? p.thumbnail_url}
                          alt={p.alt_text ?? p.title}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          placeholderClassName="h-full w-full"
                        />
                        {imageCount > 1 && (
                          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs font-semibold text-white">
                            <Images className="h-3.5 w-3.5" />
                            {imageCount}
                          </span>
                        )}
                      </div>
                      <div className="p-5">
                        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                          {p.category}
                        </span>
                        <h3 className="mt-1 font-display text-lg font-bold">{p.title}</h3>
                        <p className="mt-2 text-sm text-muted-foreground">{p.short_description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              {hasMoreItems && (
                <div className="mt-10 flex justify-center">
                  <button
                    type="button"
                    onClick={() => void loadMore()}
                    disabled={loadingMore}
                    className="rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-semibold text-primary shadow-card transition hover:border-primary/30 hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loadingMore ? "Memuat..." : "Muat lagi"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
      <PortfolioModal item={selected} onClose={() => setSelected(null)} />
    </>
  );
}
