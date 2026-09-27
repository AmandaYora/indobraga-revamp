import { useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";
import { OptionalImage } from "@/shared/components/ui/media-placeholder";
import { cn } from "@/shared/lib/cn";
import type { PortfolioModalItem } from "@/modules/portfolio/lib/portfolio-modal";

const SWIPE_THRESHOLD_PX = 40;

/** Modal carousel portofolio: panah, dots, keyboard, swipe 40px, fokus terkunci (Radix). */
export function PortfolioModal({
  item,
  open,
  onOpenChange,
}: {
  item: PortfolioModalItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [index, setIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [prevId, setPrevId] = useState(item?.id);

  // Reset indeks saat item berganti (adjust during render).
  if (item?.id !== prevId) {
    setPrevId(item?.id);
    setIndex(0);
  }

  const total = item?.images.length ?? 0;

  function go(direction: -1 | 1) {
    if (!total) return;
    setIndex((current) => (current + direction + total) % total);
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (total <= 1) return;
    if (event.key === "ArrowLeft") go(-1);
    if (event.key === "ArrowRight") go(1);
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content
          onKeyDown={handleKeyDown}
          className="fixed left-[50%] top-[50%] z-50 w-full max-w-[calc(100vw-2rem)] translate-x-[-50%] translate-y-[-50%] rounded-2xl bg-background p-4 shadow-elegant data-[state=open]:animate-fade-up sm:max-w-3xl sm:p-6"
        >
          <DialogPrimitive.Close
            aria-label="Tutup"
            className="absolute right-3 top-3 z-10 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
          >
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
          {item ? (
            <div>
              <div
                className="relative aspect-[4/3] overflow-hidden rounded-xl bg-neutral-950 sm:aspect-[16/10]"
                onTouchStart={(event) => setTouchStartX(event.touches[0].clientX)}
                onTouchEnd={(event) => {
                  if (touchStartX === null) return;
                  const delta = event.changedTouches[0].clientX - touchStartX;
                  if (Math.abs(delta) >= SWIPE_THRESHOLD_PX) go(delta > 0 ? -1 : 1);
                  setTouchStartX(null);
                }}
              >
                {item.images[index] ? (
                  <img
                    key={item.images[index].url}
                    src={item.images[index].url}
                    alt={item.images[index].alt ?? item.title}
                    className="h-full w-full object-contain animate-fade-in"
                    loading="eager"
                  />
                ) : (
                  <OptionalImage
                    src={item.cover}
                    alt={item.title}
                    className="h-full w-full"
                    loading="eager"
                  />
                )}
                {total > 1 ? (
                  <>
                    <button
                      type="button"
                      aria-label="Gambar sebelumnya"
                      onClick={() => go(-1)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Gambar berikutnya"
                      onClick={() => go(1)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <p className="absolute bottom-2 right-3 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
                      {index + 1}/{total}
                    </p>
                  </>
                ) : null}
              </div>
              {total > 1 ? (
                <div
                  className="mt-3 flex justify-center gap-1.5"
                  role="tablist"
                  aria-label="Pilih gambar"
                >
                  {item.images.map((image, dot) => (
                    <button
                      key={image.url}
                      type="button"
                      role="tab"
                      aria-label={`Ke gambar ${dot + 1}`}
                      aria-current={dot === index}
                      onClick={() => setIndex(dot)}
                      className={cn(
                        "h-2 w-2 rounded-full transition",
                        dot === index ? "bg-primary" : "bg-border hover:bg-muted-foreground",
                      )}
                    />
                  ))}
                </div>
              ) : null}
              <div className="mt-3">
                {item.category ? (
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    {item.category}
                  </p>
                ) : null}
                <DialogPrimitive.Title className="mt-1 font-bold">
                  {item.title}
                </DialogPrimitive.Title>
                {item.short_description ? (
                  <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
                    {item.short_description}
                  </DialogPrimitive.Description>
                ) : null}
              </div>
            </div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function ImageCountBadge({ count }: { count: number }) {
  if (count <= 1) return null;
  return (
    <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
      <Images className="h-3 w-3" aria-hidden="true" /> {count}
    </span>
  );
}
