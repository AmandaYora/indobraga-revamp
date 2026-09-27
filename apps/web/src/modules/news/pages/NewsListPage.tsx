import { Link, useLoaderData, useSearchParams } from "react-router-dom";
import { useMemo } from "react";
import { PageHero } from "@/shared/components/ui/page-hero";
import { OptionalImage } from "@/shared/components/ui/media-placeholder";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Seo } from "@/modules/site";
import { useApiQuery } from "@/shared/hooks/useApiQuery";
import { siteService } from "@/modules/site";
import { fallbackNewsPage } from "@/modules/site/lib/fallbacks";
import { formatDateId } from "@/shared/lib/date";
import { newsListPath } from "@/app/routes/route-paths";
import { cn } from "@/shared/lib/cn";
import { newsSearchSchema } from "@/modules/news/schemas/news-search.schema";
import type { ContractSchemas } from "@/shared/types/contract";

export const NEWS_PAGE_SIZE = 6;

function parsePage(value: string | null): number {
  return newsSearchSchema.parse({ page: value }).page;
}

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

export default function NewsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const loaderData = useLoaderData() as {
    items: ContractSchemas["PublicNewsItem"][];
    meta?: ContractSchemas["PaginationMeta"];
  } | null;
  const page = parsePage(searchParams.get("page"));

  const newsFallback = useMemo(() => fallbackNewsPage(page, NEWS_PAGE_SIZE), [page]);
  const { data, loading } = useApiQuery(
    ["public", "news", { page }],
    () => siteService.news({ page, limit: NEWS_PAGE_SIZE }),
    {
      initialData: loaderData ?? { items: newsFallback.items, meta: newsFallback.pagination },
      refetchOnMount: false,
    },
  );
  // `useApiQuery` hanya menerima bentuk service `{ items, meta }`; fallback
  // ternormalisasi di loader ke bentuk yang sama.
  const result = (data ?? { items: newsFallback.items, meta: newsFallback.pagination }) as {
    items: ContractSchemas["PublicNewsItem"][];
    meta: ContractSchemas["PaginationMeta"];
  };
  const items = result.items;
  const pagination = result.meta;
  const totalPages = Math.max(1, pagination.total_pages);

  function goTo(target: number) {
    setSearchParams(target > 1 ? { page: String(target) } : {});
    window.scrollTo({ top: 0 });
  }

  const heroImage = items[0]?.thumbnail_url ?? null;

  return (
    <>
      <Seo
        title="Berita"
        description="Kabar terbaru dari Indobraga: fasilitas, portofolio, dan produksi."
        path={page > 1 ? `/berita?page=${page}` : "/berita"}
        image={heroImage}
      />
      <PageHero
        kicker="Berita"
        title="Kabar terbaru dari Indobraga"
        subtitle="Cerita fasilitas, portofolio, dan aktivitas produksi kami."
        image={heroImage}
      />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        {loading && items.length === 0 ? (
          <NewsGridSkeleton />
        ) : items.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">
            Belum ada berita yang dipublikasikan.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {items.map((item) => (
              <Link
                key={item.id}
                to={`/berita/${item.slug}?page=${page}`}
                className="group overflow-hidden rounded-2xl border bg-card shadow-card"
              >
                <OptionalImage
                  src={item.thumbnail_url}
                  alt={item.title}
                  className="aspect-[16/9] w-full object-cover transition group-hover:scale-105"
                />
                <div className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    {item.category}
                    {item.published_at ? (
                      <span className="ml-2 font-normal normal-case text-muted-foreground">
                        {formatDateId(item.published_at, "short")}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 font-semibold">{item.title}</p>
                  {item.excerpt ? (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {item.excerpt}
                    </p>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        )}
        {totalPages > 1 ? (
          <nav
            aria-label="Pagination berita"
            className="mt-8 flex items-center justify-center gap-1"
          >
            {page > 1 ? (
              <button
                type="button"
                onClick={() => goTo(page - 1)}
                className="rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-muted"
              >
                Sebelumnya
              </button>
            ) : (
              <span className="px-3 py-1.5 text-sm text-muted-foreground">Sebelumnya</span>
            )}
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                aria-current={pageNumber === page ? "page" : undefined}
                onClick={() => goTo(pageNumber)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm",
                  pageNumber === page
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input hover:bg-muted",
                )}
              >
                {pageNumber}
              </button>
            ))}
            {page < totalPages ? (
              <button
                type="button"
                onClick={() => goTo(page + 1)}
                className="rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-muted"
              >
                Berikutnya
              </button>
            ) : (
              <span className="px-3 py-1.5 text-sm text-muted-foreground">Berikutnya</span>
            )}
          </nav>
        ) : null}
        <span className="sr-only">{newsListPath(page)}</span>
      </div>
    </>
  );
}
