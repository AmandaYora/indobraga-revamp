import type { ReactNode } from "react";
import { Toaster } from "@/shared/components/ui/sonner";
import { ErrorBoundary } from "@/app/providers/ErrorBoundary";

/** Provider aplikasi: Toaster + ErrorBoundary (paritas root legacy). */
export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      {children}
      <Toaster />
    </ErrorBoundary>
  );
}
