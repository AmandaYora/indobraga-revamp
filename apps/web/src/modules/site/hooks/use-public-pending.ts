import { useEffect, useRef, useState } from "react";
import { useNavigation } from "react-router-dom";

/** Paritas `pendingMs: 300` + `pendingMinMs: 300` route publik legacy. */
const PENDING_MS = 300;
const PENDING_MIN_MS = 300;

export type PendingRoute = "home" | "portfolio" | "facilities" | "gallery" | "news" | "news-detail";

/**
 * Route publik yang punya `pendingComponent` di legacy. `/kontak` (dan route lain) tidak punya →
 * halaman lama tetap tampil selama navigasi.
 */
export function pendingRouteFor(pathname: string): PendingRoute | null {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (path === "/") return "home";
  if (path === "/portfolio") return "portfolio";
  if (path === "/fasilitas") return "facilities";
  if (path === "/galeri") return "gallery";
  if (path === "/berita") return "news";
  if (/^\/berita\/[^/]+$/.test(path)) return "news-detail";
  return null;
}

/**
 * Skeleton navigasi publik: muncul hanya bila loader tujuan belum selesai setelah 300 ms, lalu
 * bertahan minimal 300 ms sejak tampil (menghindari kedipan) — setara TanStack Router legacy.
 */
export function usePublicPending(): PendingRoute | null {
  const navigation = useNavigation();
  const target =
    navigation.state === "loading" && navigation.location
      ? pendingRouteFor(navigation.location.pathname)
      : null;
  const loading = navigation.state === "loading";
  const [pending, setPending] = useState<{ route: PendingRoute; since: number } | null>(null);
  const shownAt = useRef<number | null>(null);

  useEffect(() => {
    if (!loading || target === null) return;
    // Skeleton sudah tampil (navigasi beruntun) → langsung ganti ke tujuan baru.
    const delay = shownAt.current !== null ? 0 : PENDING_MS;
    const timer = window.setTimeout(() => {
      if (shownAt.current === null) shownAt.current = Date.now();
      setPending({ route: target, since: shownAt.current });
    }, delay);
    return () => window.clearTimeout(timer);
  }, [loading, target]);

  useEffect(() => {
    if (loading || pending === null) return;
    const remaining = Math.max(0, PENDING_MIN_MS - (Date.now() - pending.since));
    const timer = window.setTimeout(() => {
      shownAt.current = null;
      setPending(null);
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [loading, pending]);

  return pending?.route ?? null;
}
