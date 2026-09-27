import { useEffect, useState } from "react";
import { Suspense } from "react";
import { RouterProvider as ReactRouterProvider } from "react-router-dom";
import { router } from "@/app/routes";

export function DelayedLoading() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setShow(true), 300);
    return () => window.clearTimeout(timer);
  }, []);
  if (!show) return null;
  return (
    <div className="flex min-h-screen items-center justify-center text-muted-foreground">
      Memuat…
    </div>
  );
}

export function RouterProvider() {
  return (
    <Suspense fallback={<DelayedLoading />}>
      <ReactRouterProvider router={router} />
    </Suspense>
  );
}
