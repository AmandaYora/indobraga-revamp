import { getUserFacingErrorMessage, getUserFacingErrorTitle } from "@/shared/services/api-error";

/** Port 1:1 `PublicErrorState` (`components/admin/ApiState.tsx`) legacy. */
export function PublicErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-sm">
      <p className="font-semibold text-destructive">
        {getUserFacingErrorTitle(error, { audience: "public" })}
      </p>
      <p className="text-anywhere mt-1 text-muted-foreground">
        {getUserFacingErrorMessage(error, { audience: "public", surface: "page" })}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg border border-border bg-background px-4 py-2 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
        >
          Coba lagi
        </button>
      )}
    </div>
  );
}
