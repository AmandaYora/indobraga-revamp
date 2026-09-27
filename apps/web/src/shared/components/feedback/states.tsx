import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { getUserFacingErrorMessage } from "@/shared/services/api-error";
import type { ErrorAudience } from "@/shared/services/api-error";

export function LoadingState({ label = "Memuat…" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[40vh] items-center justify-center text-muted-foreground"
    >
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" className="animate-pulse">
        {label}
      </span>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <Card>
      <div className="py-8 text-center">
        <p className="font-medium">{title}</p>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
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
      <div className="py-8 text-center">
        <p className="font-medium">Data gagal dimuat</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {getUserFacingErrorMessage(error, { audience })}
        </p>
        {onRetry ? (
          <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
            Coba lagi
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
