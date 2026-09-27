import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { Card } from "@/shared/components/ui/card";
import { GhostButton } from "@/shared/components/ui/action-buttons";
import { getUserFacingErrorMessage, getUserFacingErrorTitle } from "@/shared/services/api-error";
import type { ErrorAudience } from "@/shared/services/api-error";

/* Port `LoadingState`/`ErrorState` (`components/admin/ApiState.tsx`) & `EmptyState`
   (`components/admin/Pagination.tsx`) legacy — markup, ikon, teks, kelas 1:1. */

export function LoadingState({ label = "Memuat data..." }: { label?: string }) {
  return (
    <Card>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {label}
      </div>
    </Card>
  );
}

export function ErrorState({
  error,
  onRetry,
  audience = "admin",
}: {
  error: unknown;
  onRetry?: () => void;
  audience?: ErrorAudience;
}) {
  return (
    <Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="min-w-0">
            <p className="font-semibold text-destructive">
              {getUserFacingErrorTitle(error, { audience })}
            </p>
            <p className="text-anywhere mt-1 text-sm text-muted-foreground">
              {getUserFacingErrorMessage(error, { audience })}
            </p>
          </div>
        </div>
        {onRetry && (
          <GhostButton type="button" onClick={onRetry} className="shrink-0">
            <RefreshCw className="h-4 w-4" />
            Coba lagi
          </GhostButton>
        )}
      </div>
    </Card>
  );
}

/** Empty state untuk daftar admin (digunakan saat hasil filter kosong). */
export function EmptyState({
  title = "Tidak ada data",
  description = "Belum ada data yang cocok dengan filter saat ini.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 p-10 text-center">
      <p className="font-display text-base font-bold text-foreground">{title}</p>
      <p className="max-w-sm text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
