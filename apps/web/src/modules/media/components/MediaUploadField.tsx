import { useRef, useState } from "react";
import { toast } from "sonner";
import { prepareImageForUpload } from "@/shared/lib/image-compression";
import { mediaService } from "@/modules/media";
import { ApiError, getUserFacingErrorMessage } from "@/shared/services/api-error";
import type { ContractSchemas } from "@/shared/types/contract";

type MediaItem = ContractSchemas["MediaItem"];
type MediaUsage = ContractSchemas["MediaUsage"];

export function MediaUploadField({
  label = "Gambar",
  hint,
  usage,
  value,
  previewUrl,
  accept = "image/*",
  onUploaded,
}: {
  label?: string;
  hint?: string;
  usage: MediaUsage;
  value?: number | null;
  previewUrl?: string | null;
  accept?: string;
  onUploaded: (media: MediaItem) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file || uploading) return;
    setUploading(true);
    setProgress(0);
    try {
      const prepared = await prepareImageForUpload(file);
      const media = await mediaService.uploadWithProgress(
        prepared.file,
        { usage, alt_text: file.name },
        (percent) => setProgress(percent),
      );
      onUploaded(media);
      toast.success("Media berhasil diunggah");
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.code === "PAYLOAD_TOO_LARGE" || error.code === "UNSUPPORTED_MEDIA_TYPE")
      ) {
        toast.error("Unggah gagal", { description: getUserFacingErrorMessage(error) });
      } else {
        toast.error("Unggah gagal", {
          description: error instanceof ApiError ? getUserFacingErrorMessage(error) : undefined,
        });
      }
    } finally {
      setUploading(false);
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <p className="mb-1 text-sm font-medium">{label}</p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex w-full items-center gap-4 rounded-xl border border-dashed border-input p-4 text-left hover:bg-muted/50 disabled:opacity-50"
      >
        {previewUrl ? (
          <img src={previewUrl} alt="" className="h-14 w-20 rounded-lg object-cover" />
        ) : (
          <span className="flex h-14 w-20 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
            {value ? `#${value}` : "Belum ada"}
          </span>
        )}
        <span className="text-sm text-muted-foreground">
          {uploading
            ? progress !== null
              ? `Mengunggah... ${progress}%`
              : "Mengunggah..."
            : "Klik untuk memilih file"}
        </span>
      </button>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        aria-label={label}
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
    </div>
  );
}
