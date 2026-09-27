import { useEffect, useState } from "react";
import { useLoaderData } from "react-router-dom";
import { Play, X } from "lucide-react";
import { PageHero } from "@/shared/components/ui/page-hero";
import { OptionalImage } from "@/shared/components/ui/media-placeholder";
import { Seo } from "@/modules/site";
import { useApiQuery } from "@/shared/hooks/useApiQuery";
import { siteService } from "@/modules/site";
import type { CursorMeta } from "@/shared/services/http-client";
import { formatDateId } from "@/shared/lib/date";
import { cn } from "@/shared/lib/cn";
import type { ContractSchemas } from "@/shared/types/contract";
import { GalleryGridSkeleton } from "@/modules/gallery/components/GallerySkeletons";

type GalleryItem = ContractSchemas["PublicGalleryItem"];
const GALLERY_BATCH_SIZE = 8;

const EMPTY_GALLERY_LIST: { items: GalleryItem[]; meta?: CursorMeta } = {
  items: [],
  meta: { limit: 8, next_cursor: null, has_more: false },
};

function GalleryLightbox({
  item,
  onClose,
  onPrev,
  onNext,
}: {
  item: GalleryItem;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") onPrev();
      if (event.key === "ArrowRight") onNext();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose, onPrev, onNext]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={item.caption ?? "Pratinjau galeri"}
      className="fixed inset-0 z-50 flex flex-col bg-black/85 p-4 animate-fade-in"
    >
      <button
        type="button"
        aria-label="Tutup pratinjau"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      <div className="relative flex justify-end">
        <button
          type="button"
          aria-label="Tutup"
          onClick={onClose}
          className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="relative flex flex-1 items-center justify-center gap-2">
        <button
          type="button"
          aria-label="Sebelumnya"
          onClick={onPrev}
          className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        >
          ‹
        </button>
        <div className="max-h-[70vh] max-w-4xl flex-1">
          {item.type === "video" ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-xl bg-neutral-900 text-white">
              <OptionalImage
                src={item.thumbnail_url}
                alt={item.caption ?? "Pratinjau video galeri"}
                className="max-h-48 object-contain"
              />
              <p className="text-sm text-white/70">
                {item.media_url ? "Pratinjau video galeri" : "Pratinjau video belum tersedia"}
              </p>
            </div>
          ) : (
            <OptionalImage
              src={item.media_url ?? item.thumbnail_url}
              alt={item.caption ?? "Foto galeri"}
              className="max-h-[70vh] w-full rounded-xl object-contain"
              loading="eager"
            />
          )}
        </div>
        <button
          type="button"
          aria-label="Berikutnya"
          onClick={onNext}
          className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        >
          ›
        </button>
      </div>
      <div className="relative pt-3 text-center text-sm text-white/80">
        {item.published_at ? <p>{formatDateId(item.published_at, "long")}</p> : null}
        {item.caption ? <p className="mt-1">{item.caption}</p> : null}
      </div>
    </div>
  );
}

export default function GalleryPage() {
  const loaderData = useLoaderData() as {
    items: GalleryItem[];
    meta?: { next_cursor?: string | null; has_more?: boolean };
  } | null;
  const { data, loading } = useApiQuery(
    ["public", "gallery", { limit: 24 }],
    () => siteService.gallery({ limit: 24 }),
    {
      initialData: loaderData ?? EMPTY_GALLERY_LIST,
      refetchOnMount: false,
    },
  );
  const [items, setItems] = useState<GalleryItem[]>(() => data?.items ?? []);
  const [cursor, setCursor] = useState<string | null>(() => data?.meta?.next_cursor ?? null);
  const [hasMore, setHasMore] = useState(() => Boolean(data?.meta?.has_more));
  const [visibleCount, setVisibleCount] = useState(GALLERY_BATCH_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const visible = items.slice(0, visibleCount);

  async function loadMore() {
    if (loadingMore) return;
    if (visibleCount < items.length) {
      setVisibleCount((count) => count + GALLERY_BATCH_SIZE);
      return;
    }
    if (!hasMore || !cursor) return;
    setLoadingMore(true);
    try {
      const result = await siteService.gallery({ limit: 24, cursor });
      setItems((current) => [...current, ...result.items]);
      setCursor(result.meta?.next_cursor ?? null);
      setHasMore(Boolean(result.meta?.has_more));
      setVisibleCount((count) => count + GALLERY_BATCH_SIZE);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <>
      <Seo
        title="Galeri"
        description="Dokumentasi visual Indobraga: aktivitas produksi, fasilitas, dan merchandise."
        path="/galeri"
      />
      <PageHero
        kicker="Galeri Perusahaan"
        title="Dokumentasi Visual Indobraga"
        subtitle="Aktivitas produksi, fasilitas, dan hasil karya tim Indobraga."
      />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        {loading && items.length === 0 ? (
          <GalleryGridSkeleton />
        ) : visible.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">
            Belum ada konten galeri yang dipublikasikan.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {visible.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setLightboxIndex(index)}
                className={cn(
                  "group relative overflow-hidden rounded-xl animate-fade-in",
                  index % 7 === 0 ? "row-span-2 aspect-[3/4] sm:col-span-2" : "aspect-square",
                )}
                aria-label={`Buka ${item.caption ?? "gambar galeri"}`}
              >
                <OptionalImage
                  src={item.thumbnail_url ?? item.media_url}
                  alt={item.caption ?? "Foto galeri"}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
                {item.type === "video" ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <span className="rounded-full bg-white/90 p-3">
                      <Play className="h-5 w-5 text-primary-deep" />
                    </span>
                  </span>
                ) : null}
                {item.caption ? (
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-left text-xs text-white opacity-0 transition group-hover:opacity-100">
                    {item.caption}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        )}
        {(visibleCount < items.length || hasMore) && visible.length > 0 ? (
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
      {lightboxIndex !== null && visible[lightboxIndex] ? (
        <GalleryLightbox
          item={visible[lightboxIndex]}
          onClose={() => setLightboxIndex(null)}
          onPrev={() =>
            setLightboxIndex((current) =>
              current === null ? null : (current - 1 + visible.length) % visible.length,
            )
          }
          onNext={() =>
            setLightboxIndex((current) =>
              current === null ? null : (current + 1) % visible.length,
            )
          }
        />
      ) : null}
    </>
  );
}
