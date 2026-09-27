import { readBootstrap } from "@/shared/services/bootstrap";

/**
 * Loader halaman publik: pakai payload bootstrap `page` bila URL cocok
 * (load pertama dari shell Go), selain itu panggil API (navigasi client),
 * fallback statis bila keduanya gagal — halaman tidak pernah kosong.
 */
export async function loadPublicPage<T>(
  path: string,
  fetch: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    const bootstrap = readBootstrap(path);
    if (bootstrap && typeof bootstrap.page === "object" && bootstrap.page !== null) {
      return bootstrap.page as T;
    }
  } catch {
    // Abaikan payload berbahaya — lanjut ke API.
  }
  try {
    return await fetch();
  } catch {
    return fallback;
  }
}
