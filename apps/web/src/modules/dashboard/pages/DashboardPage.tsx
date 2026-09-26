import { useEffect } from "react";
import { useHealthStore } from "@/modules/dashboard/stores/health.store";

export default function DashboardPage() {
  const { status, result, error, check } = useHealthStore();

  useEffect(() => {
    check();
  }, [check]);

  return (
    <div className="min-h-screen bg-[var(--color-background)] p-8">
      <h1 className="text-2xl font-semibold text-[var(--color-text)]">Dashboard</h1>
      <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <p className="text-sm text-[var(--color-muted)]">API health check (/api/v1/health)</p>
        {status === "loading" && <p>Checking…</p>}
        {status === "error" && <p className="text-red-600">{error}</p>}
        {status === "success" && (
          <pre className="mt-2 text-sm">{JSON.stringify(result, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}
