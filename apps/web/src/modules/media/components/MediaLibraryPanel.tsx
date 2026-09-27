import { useState } from "react";
import { toast } from "sonner";
import { mediaService, mediaPreviewUrl } from "@/modules/media";
import { useApiQuery } from "@/shared/hooks/useApiQuery";
import { ApiError, getUserFacingErrorMessage } from "@/shared/services/api-error";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { mediaStatusTone } from "@/modules/content/lib/status-map";
import { ConfirmDialog } from "@/modules/content/components/CrudModal";
import { ErrorState, LoadingState } from "@/shared/components/feedback/states";
import { cn } from "@/shared/lib/cn";

type LibraryFilter = "active" | "archived" | "cleanup_failed";

const FILTERS: { value: LibraryFilter; label: string }[] = [
  { value: "active", label: "Aktif" },
  { value: "archived", label: "Arsip" },
  { value: "cleanup_failed", label: "Perlu dibersihkan" },
];

const STATUS_LABEL: Record<string, string> = {
  processing: "Diproses",
  completed: "Siap",
  failed: "Gagal",
  archived: "Diarsipkan",
  pending_delete: "Menunggu dihapus",
  deleted: "Dihapus",
  cleanup_failed: "Perlu dibersihkan",
};

/** Pustaka media: filter aktif/arsip/cleanup_failed; retry, arsip, unarsip, hapus; 24 item pertama. */
export function MediaLibraryPanel() {
  const [filter, setFilter] = useState<LibraryFilter>("active");
  const [confirm, setConfirm] = useState<{
    title: string;
    description: string;
    action: () => Promise<void>;
  } | null>(null);

  const { data, error, loading, reload } = useApiQuery(["admin", "media-library", filter], () =>
    mediaService.list({
      limit: 24,
      ...(filter === "active" ? {} : { compression_status: filter }),
    }),
  );
  const items = data?.items ?? [];

  async function run(action: () => Promise<unknown>, successMessage: string) {
    try {
      await action();
      toast.success(successMessage);
      reload();
    } catch (requestError) {
      toast.error("Aksi gagal", {
        description:
          requestError instanceof ApiError ? getUserFacingErrorMessage(requestError) : undefined,
      });
    }
  }

  if (loading && !data) return <LoadingState label="Memuat pustaka media..." />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;

  return (
    <section aria-label="Pustaka media" className="mt-8">
      <h2 className="text-lg font-bold">Pustaka Media</h2>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filter pustaka">
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={filter === option.value}
            onClick={() => setFilter(option.value)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm",
              filter === option.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input hover:bg-muted",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Belum ada media pada filter ini.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {items.slice(0, 24).map((item) => (
            <div key={item.id} className="overflow-hidden rounded-xl border bg-card">
              {item.media_type === "video" ? (
                <div className="flex aspect-square items-center justify-center bg-neutral-900 text-xs text-white">
                  Video
                </div>
              ) : mediaPreviewUrl(item) ? (
                <img
                  src={mediaPreviewUrl(item) as string}
                  alt={item.original_file_name ?? `Media #${item.id}`}
                  className="aspect-square w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex aspect-square items-center justify-center bg-muted text-xs text-muted-foreground">
                  #{item.id}
                </div>
              )}
              <div className="space-y-1 p-2">
                <Badge tone={mediaStatusTone(item.compression_status)}>
                  {STATUS_LABEL[item.compression_status] ?? item.compression_status}
                </Badge>
                <p className="text-[11px] text-muted-foreground">
                  {item.media_type === "video" ? "Video" : "Gambar"} · #{item.id}
                </p>
                {item.error ? <p className="text-[11px] text-destructive">{item.error}</p> : null}
                <div className="flex flex-wrap gap-1 pt-1">
                  {item.compression_status === "failed" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void run(() => mediaService.retry(item.id), "Media dijadwalkan ulang")
                      }
                    >
                      Coba lagi
                    </Button>
                  ) : null}
                  {item.compression_status === "archived" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void run(
                          () => mediaService.unarchive(item.id),
                          "Media dikeluarkan dari arsip",
                        )
                      }
                    >
                      Keluarkan
                    </Button>
                  ) : null}
                  {item.compression_status !== "archived" &&
                  item.compression_status !== "cleanup_failed" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setConfirm({
                          title: "Arsipkan media ini?",
                          description: `Media #${item.id} dipindahkan ke arsip dan tidak tampil di pilihan.`,
                          action: () => mediaService.archive(item.id).then(() => undefined),
                        })
                      }
                    >
                      Arsip
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() =>
                      setConfirm({
                        title: "Hapus media permanen?",
                        description: `Media #${item.id} dihapus permanen dan tidak bisa dikembalikan.`,
                        action: () => mediaService.remove(item.id),
                      })
                    }
                  >
                    Hapus
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
        title={confirm?.title ?? ""}
        description={confirm?.description}
        confirmLabel="Ya, lanjutkan"
        onConfirm={async () => {
          if (confirm) await run(confirm.action, "Berhasil");
          setConfirm(null);
        }}
      />
    </section>
  );
}
