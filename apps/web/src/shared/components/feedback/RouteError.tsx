import { useRevalidator, useRouteError } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";

/** Fallback error route — tombol coba lagi memicu `revalidator.revalidate()`. */
export function RouteError() {
  const routeError = useRouteError();
  const revalidator = useRevalidator();
  const message =
    routeError instanceof Error &&
    !/Failed to fetch|dynamically imported module/i.test(routeError.message)
      ? routeError.message
      : "Halaman belum bisa ditampilkan. Coba lagi.";
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-xl font-bold">Terjadi kendala</h1>
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" onClick={() => revalidator.revalidate()}>
        Coba lagi
      </Button>
    </div>
  );
}
