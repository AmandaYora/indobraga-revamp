import { useState } from "react";
import { useLoaderData } from "react-router-dom";
import { Play, X } from "lucide-react";
import { MediaPlaceholder, OptionalImage } from "@/shared/components/ui/media-placeholder";
import { PageHero } from "@/shared/components/ui/page-hero";
import { useApiQuery } from "@/shared/hooks/useApiQuery";
import { formatDateId } from "@/shared/lib/date";
import type { ContractSchemas } from "@/shared/types/contract";
import { Seo } from "@/modules/site/components/Seo";
import { PublicErrorState } from "@/modules/site/components/PublicErrorState";
import { siteService, type CursorList } from "@/modules/site/services/site.service";
import { GALLERY_LIMIT } from "@/modules/site/services/public.loaders";
import { PAGE_HERO, PAGE_SEO } from "@/modules/site/lib/page-copy";
import { GalleryGridSkeleton } from "@/modules/gallery/components/GallerySkeletons";

type GalleryItem = ContractSchemas["PublicGalleryItem"];

const GALLERY_BATCH_SIZE = 8;

/** Port 1:1 `GalleryPage` di `routes/_public.galeri.tsx` legacy (grid, reveal, lightbox). */
export default function GalleryPage() {
  const initialGallery = useLoaderData() as CursorList<GalleryItem> | null;
  const [active, setActive] = useState<GalleryItem | null>(null);
  const [visibleCount, setVisibleCount] = useState(GALLERY_BATCH_SIZE);
  const { data, error, loading, reload, setData } = useApiQuery(
    ["public", "gallery"],
    () => siteService.gallery({ limit: GALLERY_LIMIT }),
    {
      initialData: initialGallery,
      refetchOnMount: false,
    },
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const items = data?.items ?? [];
  const visibleItems = items.slice(0, visibleCount);
  const hasMoreItems = visibleCount < items.length || Boolean(data?.meta?.has_more);

  const loadMore = async () => {
    if (visibleCount < items.length) {
      setVisibleCount((count) => Math.min(count + GALLERY_BATCH_SIZE, items.length));
      return;
    }
    const nextCursor = data?.meta?.next_cursor;
    if (!nextCursor || loadingMore) {
      return;
    }
    setLoadingMore(true);
    try {
      const page = await siteService.gallery({ limit: GALLERY_LIMIT, cursor: nextCursor });
      setData((prev) =>
        prev
          ? {
              items: [...prev.items, ...page.items],
              meta: page.meta,
            }
          : page,
      );
      setVisibleCount((count) => count + GALLERY_BATCH_SIZE);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <>
      <Seo {...PAGE_SEO.gallery} />
      <PageHero {...PAGE_HERO.gallery} />
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {error && <PublicErrorState error={error} onRetry={reload} />}
        {loading && !data ? (
          <GalleryGridSkeleton />
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
            Belum ada konten galeri yang dipublikasikan.
          </div>
        ) : (
          <>
            <div className="grid min-w-0 grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {visibleItems.map((item, i) => {
                const previewSrc = item.thumbnail_url ?? item.media_url ?? null;

                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setActive(item)}
                    className={`group relative min-w-0 overflow-hidden rounded-2xl bg-muted shadow-card transition hover:shadow-elegant ${
                      i % 7 === 0 ? "row-span-2 aspect-[3/4] sm:col-span-2" : "aspect-square"
                    }`}
                  >
                    <OptionalImage
                      src={previewSrc}
                      alt={item.caption}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      placeholderClassName="h-full w-full"
                    />
                    {item.type === "video" && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-primary-deep shadow-elegant">
                          <Play className="h-6 w-6 fill-current" />
                        </span>
                      </span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-3 text-left opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
                      <p className="line-clamp-2 text-xs font-medium text-white sm:text-sm">
                        {item.caption}
                      </p>
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
      </section>

      {active && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setActive(null)}
        >
          <button
            onClick={() => setActive(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Tutup"
            title="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
          <div
            role="presentation"
            className="relative max-h-[90vh] w-full max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl bg-card sm:max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            {active.type === "video" ? (
              <div className="relative flex aspect-video items-center justify-center bg-black text-white">
                {(active.thumbnail_url ?? active.media_url) ? (
                  <img
                    src={active.thumbnail_url ?? active.media_url ?? ""}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover opacity-60"
                  />
                ) : (
                  <MediaPlaceholder
                    label="Pratinjau video belum tersedia"
                    className="absolute inset-0 bg-black text-white/75"
                  />
                )}
                <div className="relative flex flex-col items-center gap-2 text-center">
                  <Play className="h-12 w-12" />
                  <p className="text-sm text-white/80">Pratinjau video galeri</p>
                </div>
              </div>
            ) : (
              <OptionalImage
                src={active.media_url ?? active.thumbnail_url}
                alt={active.caption}
                className="max-h-[70vh] w-full object-contain"
                placeholderClassName="h-[50vh] w-full"
              />
            )}
            <div className="border-t border-border p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                {formatDateId(active.published_at ?? "", "long")}
              </p>
              <p className="mt-1 text-sm text-foreground">{active.caption}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
