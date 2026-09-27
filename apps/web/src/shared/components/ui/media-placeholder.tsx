import { ImageIcon } from "lucide-react";
import { cn } from "@/shared/lib/cn";

export function MediaPlaceholder({
  label = "Media belum tersedia",
  className,
  iconClassName,
  textClassName,
}: {
  label?: string;
  className?: string;
  iconClassName?: string;
  textClassName?: string;
}) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-2 bg-muted p-6", className)}
      role="img"
      aria-label={label}
    >
      <ImageIcon
        className={cn("h-6 w-6 text-muted-foreground", iconClassName)}
        aria-hidden="true"
      />
      <span className={cn("text-xs text-muted-foreground", textClassName)}>{label}</span>
    </div>
  );
}

export function OptionalImage({
  src,
  alt,
  className,
  placeholderClassName,
  loading = "lazy",
}: {
  src?: string | null;
  alt: string;
  className?: string;
  placeholderClassName?: string;
  loading?: "lazy" | "eager";
}) {
  if (!src) {
    return (
      <MediaPlaceholder
        label="Gambar belum diunggah"
        className={cn(className, placeholderClassName)}
      />
    );
  }
  return <img src={src} alt={alt} className={className} loading={loading} />;
}
