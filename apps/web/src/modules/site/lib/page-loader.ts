import { readBootstrap } from "@/shared/services/bootstrap";

// Payload `page` bootstrap hanya berlaku untuk load pertama halaman tersebut; navigasi client
// berikutnya ke URL yang sama memanggil API (setara loader legacy yang selalu fetch).
const consumedBootstrapPaths = new Set<string>();

/**
 * Loader halaman publik: pakai payload bootstrap `page` bila path cocok dan bentuknya diterima
 * `accept` (load pertama dari shell Go), selain itu panggil API (navigasi client), fallback
 * statis bila API gagal — halaman tidak pernah kosong (paritas `try/catch → fallback*` legacy).
 */
export async function loadPublicPage<T>(
  path: string,
  fetch: () => Promise<T>,
  fallback: T | (() => T),
  accept: (page: object) => boolean = () => true,
): Promise<T> {
  try {
    if (!consumedBootstrapPaths.has(path)) {
      const bootstrap = readBootstrap(path);
      const page = bootstrap?.page;
      if (typeof page === "object" && page !== null && accept(page)) {
        consumedBootstrapPaths.add(path);
        return page as T;
      }
    }
  } catch {
    // Abaikan payload berbahaya — lanjut ke API.
  }
  try {
    return await fetch();
  } catch {
    return typeof fallback === "function" ? (fallback as () => T)() : fallback;
  }
}

/** Guard ringan bentuk `{ items: [] }`. */
export function hasItems(value: unknown): value is { items: unknown[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { items?: unknown }).items)
  );
}
