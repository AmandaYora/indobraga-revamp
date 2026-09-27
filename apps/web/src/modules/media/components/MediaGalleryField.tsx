import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { toast } from "sonner";
import { prepareImageForUpload } from "@/shared/lib/image-compression";
import { mediaService, mediaPreviewUrl } from "@/modules/media";
import { IconActionButton } from "@/shared/components/ui/icon-action-button";
import type { ContractSchemas } from "@/shared/types/contract";

type MediaItem = ContractSchemas["MediaItem"];
type MediaUsage = ContractSchemas["MediaUsage"];

export function MediaGalleryField({
  label = "Galeri media",
  hint,
  usage,
  max = 10,
  accept = "image/*",
  ids,
  previews,
  onChange,
}: {
  label?: string;
  hint?: string;
  usage: MediaUsage;
  max?: number;
  accept?: string;
  ids: number[];
  previews: (MediaItem | null)[];
  onChange: (ids: number[], previews: (MediaItem | null)[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const remaining = max - ids.length;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || uploading) return;
    if (remaining <= 0) {
      toast.error(`Batas maksimal ${max} gambar sudah tercapai.`);
      return;
    }
    setUploading(true);
    try {
      const selected = [...files].slice(0, remaining);
      const nextIds = [...ids];
      const nextPreviews = [...previews];
      for (const file of selected) {
        try {
          const prepared = await prepareImageForUpload(file);
          const media = await mediaService.upload(prepared.file, { usage, alt_text: file.name });
          if (nextIds.includes(media.id)) continue;
          nextIds.push(media.id);
          nextPreviews.push(media);
        } catch {
          toast.error(`Gagal mengunggah ${file.name}`);
        }
      }
      onChange(nextIds, nextPreviews);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    const nextIds = [...ids];
    const nextPreviews = [...previews];
    [nextIds[index], nextIds[target]] = [nextIds[target], nextIds[index]];
    [nextPreviews[index], nextPreviews[target]] = [nextPreviews[target], nextPreviews[index]];
    onChange(nextIds, nextPreviews);
  }

  function remove(index: number) {
    onChange(
      ids.filter((_, position) => position !== index),
      previews.filter((_, position) => position !== index),
    );
  }

  return (
    <div>
      <p className="mb-1 text-sm font-medium">{label}</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {ids.map((id, index) => (
          <div key={`${id}-${index}`} className="relative overflow-hidden rounded-lg border">
            {index === 0 ? (
              <span className="absolute left-1 top-1 z-10 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                Sampul
              </span>
            ) : null}
            {mediaPreviewUrl(previews[index]) ? (
              <img
                src={mediaPreviewUrl(previews[index]) as string}
                alt=""
                className="aspect-square w-full object-cover"
              />
            ) : (
              <span className="flex aspect-square items-center justify-center bg-muted text-xs">
                #{id}
              </span>
            )}
            <div className="absolute bottom-1 right-1 flex gap-1">
              <IconActionButton
                label="Geser kiri"
                icon={ArrowLeft}
                className="h-6 w-6 bg-background/90"
                onClick={() => move(index, -1)}
              />
              <IconActionButton
                label="Geser kanan"
                icon={ArrowRight}
                className="h-6 w-6 bg-background/90"
                onClick={() => move(index, 1)}
              />
              <IconActionButton
                label="Hapus"
                icon={X}
                tone="danger"
                className="h-6 w-6 bg-background/90"
                onClick={() => remove(index)}
              />
            </div>
          </div>
        ))}
        {remaining > 0 ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-input text-sm text-muted-foreground hover:bg-muted/50 disabled:opacity-50"
          >
            {uploading ? "Mengunggah..." : `+ Tambah (${remaining})`}
          </button>
        ) : null}
      </div>
      {remaining <= 0 ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Batas maksimal {max} gambar sudah tercapai.
        </p>
      ) : null}
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        aria-label={label}
        onChange={(event) => void handleFiles(event.target.files)}
      />
    </div>
  );
}
