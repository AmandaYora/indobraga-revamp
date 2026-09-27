import { useMemo, useState } from "react";
import { useLoaderData } from "react-router-dom";
import { PageHero } from "@/shared/components/ui/page-hero";
import { OptionalImage } from "@/shared/components/ui/media-placeholder";
import { Seo } from "@/modules/site";
import { useApiQuery } from "@/shared/hooks/useApiQuery";
import { siteService } from "@/modules/site";
import { PortfolioModal, ImageCountBadge } from "@/modules/portfolio/components/PortfolioModal";
import { toModalItem, type PortfolioModalItem } from "@/modules/portfolio/lib/portfolio-modal";
import { cn } from "@/shared/lib/cn";
import type { ContractSchemas } from "@/shared/types/contract";

const PORTFOLIO_BATCH_SIZE = 8;

const EMPTY_PORTFOLIO_LIST = {
  items: [],
  meta: { limit: 8, next_cursor: null as string | null, has_more: false },
};

const EMPTY_CATEGORIES: { items: ContractSchemas["PublicPortfolioCategory"][] } = { items: [] };

type PortfolioItem = ContractSchemas["PublicPortfolioItem"];

export default function PortfolioPage() {
  const loaderData = useLoaderData() as {
    categories: { items: ContractSchemas["PublicPortfolioCategory"][] };
    list: { items: PortfolioItem[]; meta?: { next_cursor?: string | null; has_more?: boolean } };
  } | null;
  const categoriesQuery = useApiQuery(
    ["public", "portfolio-categories"],
    () => siteService.portfolioCategories(),
    {
      initialData: loaderData?.categories ?? EMPTY_CATEGORIES,
      refetchOnMount: false,
    },
  );
  const listQuery = useApiQuery(
    ["public", "portfolio", { limit: 24 }],
    () => siteService.portfolio({ limit: 24 }),
    {
      initialData: loaderData?.list ?? EMPTY_PORTFOLIO_LIST,
      refetchOnMount: false,
    },
  );

  const categories = useMemo(() => {
    const items = categoriesQuery.data?.items ?? EMPTY_CATEGORIES.items;
    return [{ slug: "all", name: "Semua" }, ...items];
  }, [categoriesQuery.data]);

  const [activeCategory, setActiveCategory] = useState("all");
  const [visibleCount, setVisibleCount] = useState(PORTFOLIO_BATCH_SIZE);
  const [items, setItems] = useState<PortfolioItem[]>(() => listQuery.data?.items ?? []);
  const [cursor, setCursor] = useState<string | null>(
    () => listQuery.data?.meta?.next_cursor ?? null,
  );
  const [hasMore, setHasMore] = useState(() => Boolean(listQuery.data?.meta?.has_more));
  const [loadingMore, setLoadingMore] = useState(false);
  const [selected, setSelected] = useState<PortfolioModalItem | null>(null);

  // Kategori tak dikenal (mis. data susulan) kembali ke "Semua" tanpa state effect.
  const effectiveCategory = categories.some((category) => category.slug === activeCategory)
    ? activeCategory
    : "all";

  function selectCategory(slug: string) {
    setActiveCategory(slug);
    setVisibleCount(PORTFOLIO_BATCH_SIZE);
  }

  const filtered = useMemo(() => {
    if (effectiveCategory === "all") return items;
    return items.filter(
      (item) =>
        item.category === effectiveCategory ||
        item.category_slug === effectiveCategory ||
        item.category === categories.find((category) => category.slug === effectiveCategory)?.name,
    );
  }, [items, effectiveCategory, categories]);

  const visibleList = filtered.slice(0, visibleCount);
  const canLoadMore = visibleCount < filtered.length || hasMore;

  async function loadMore() {
    if (loadingMore) return;
    if (visibleCount < filtered.length) {
      setVisibleCount((count) => count + PORTFOLIO_BATCH_SIZE);
      return;
    }
    if (!hasMore || !cursor) return;
    setLoadingMore(true);
    try {
      const result = await siteService.portfolio({ limit: 24, cursor });
      setItems((current) => [...current, ...result.items]);
      setCursor(result.meta?.next_cursor ?? null);
      setHasMore(Boolean(result.meta?.has_more));
      setVisibleCount((count) => count + PORTFOLIO_BATCH_SIZE);
    } finally {
      setLoadingMore(false);
    }
  }

  const heroImage = visibleList[0]?.medium_url ?? null;

  return (
    <>
      <Seo
        title="Portofolio"
        description="Hasil produksi apparel dan merchandise multiproduk Indobraga."
        path="/portfolio"
        image={heroImage}
      />
      <PageHero
        kicker="Portofolio"
        title="Hasil produksi apparel dan merchandise multiproduk"
        subtitle="Jersey, polo, wearpack, windrunner, hoodie, corporate uniform, t-shirt, dan bag merchandise."
        image={heroImage}
      />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter kategori">
          {categories.map((category) => (
            <button
              key={category.slug}
              type="button"
              onClick={() => selectCategory(category.slug)}
              aria-pressed={effectiveCategory === category.slug}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm transition",
                effectiveCategory === category.slug
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input hover:bg-muted",
              )}
            >
              {category.name}
            </button>
          ))}
        </div>
        <div className="mt-8">
          {listQuery.loading && items.length === 0 ? (
            <PortfolioGridSkeleton />
          ) : visibleList.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">
              Belum ada portofolio yang dipublikasikan untuk kategori ini.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {visibleList.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelected(toModalItem(item))}
                  className="group relative overflow-hidden rounded-2xl border bg-card text-left shadow-card"
                >
                  <OptionalImage
                    src={item.medium_url ?? item.thumbnail_url}
                    alt={item.alt_text ?? item.title}
                    className="aspect-[4/3] w-full object-cover transition group-hover:scale-105"
                  />
                  <ImageCountBadge count={item.images?.length ?? 0} />
                  <span className="block p-3">
                    <span className="block truncate text-sm font-semibold">{item.title}</span>
                    {item.category ? (
                      <span className="text-xs uppercase tracking-wide text-primary">
                        {item.category}
                      </span>
                    ) : null}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        {canLoadMore && visibleList.length > 0 ? (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="rounded-full border border-input px-6 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              {loadingMore ? "Memuat..." : "Muat lagi"}
            </button>
          </div>
        ) : null}
      </div>
      <PortfolioModal
        item={selected}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </>
  );
}
