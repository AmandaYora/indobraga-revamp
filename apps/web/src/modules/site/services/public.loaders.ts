import type { LoaderFunctionArgs } from "react-router-dom";
import * as z from "zod/mini";
import { siteService } from "@/modules/site/services/site.service";
import { hasItems, loadPublicPage } from "@/modules/site/lib/page-loader";
import {
  fallbackFacilities,
  fallbackGalleryList,
  fallbackHome,
  fallbackNewsDetail,
  fallbackNewsPage,
  fallbackPortfolioCategories,
  fallbackPortfolioList,
} from "@/modules/site/lib/fallbacks";
import { ApiError } from "@/shared/services/api-error";
import type { ContractSchemas } from "@/shared/types/contract";

/** Batas list per request — sama dengan loader legacy. */
export const PORTFOLIO_LIMIT = 24;
export const GALLERY_LIMIT = 24;
export const NEWS_PAGE_SIZE = 6;

// `validateSearch` legacy: page = Number(search.page ?? 1); finite & > 0 → floor, selain itu 1.
const pageSchema = z.catch(z.coerce.number().check(z.positive()), 1);

export function parseNewsPage(raw: string | null): number {
  const value = pageSchema.parse(raw ?? 1);
  return Number.isFinite(value) ? Math.floor(value) : 1;
}

export async function homeLoader() {
  return loadPublicPage("/", () => siteService.home(), fallbackHome);
}

export type PortfolioLoaderData = {
  portfolio: Awaited<ReturnType<typeof siteService.portfolio>>;
  categories: { items: ContractSchemas["PublicPortfolioCategory"][] };
};

/**
 * Paritas loader `/portfolio` legacy: list (limit 24) + kategori diambil paralel; bila salah
 * satu gagal keduanya memakai fallback. Payload bootstrap `page` berbentuk
 * `{ portfolio, categories }` (bukan satu objek yang dipakai dua kali).
 */
export async function portfolioLoader(): Promise<PortfolioLoaderData> {
  return loadPublicPage<PortfolioLoaderData>(
    "/portfolio",
    async () => {
      const [portfolio, categories] = await Promise.all([
        siteService.portfolio({ limit: PORTFOLIO_LIMIT }),
        siteService.portfolioCategories(),
      ]);
      return { portfolio, categories };
    },
    () => ({
      portfolio: fallbackPortfolioList(undefined, PORTFOLIO_LIMIT),
      categories: fallbackPortfolioCategories(),
    }),
    (page) => {
      const data = page as Partial<PortfolioLoaderData>;
      return hasItems(data.portfolio) && hasItems(data.categories);
    },
  );
}

export async function facilitiesLoader() {
  return loadPublicPage("/fasilitas", () => siteService.facilities(), fallbackFacilities);
}

export async function galleryLoader() {
  return loadPublicPage(
    "/galeri",
    () => siteService.gallery({ limit: GALLERY_LIMIT }),
    () => fallbackGalleryList(GALLERY_LIMIT),
    hasItems,
  );
}

export async function newsListLoader({ request }: LoaderFunctionArgs) {
  const page = parseNewsPage(new URL(request.url).searchParams.get("page"));
  return loadPublicPage(
    "/berita",
    () => siteService.news({ page, limit: NEWS_PAGE_SIZE }),
    () => fallbackNewsPage(page, NEWS_PAGE_SIZE),
    (payload) => {
      const meta = (payload as { meta?: { page?: number } }).meta;
      return hasItems(payload) && (meta?.page ?? 1) === page;
    },
  );
}

export type NewsDetailLoaderData = {
  detail: ContractSchemas["PublicNewsDetail"] | null;
  /** Slug tidak dikenal API (404) dan tidak ada di fallback → Not Found (BC-22). */
  notFound: boolean;
};

/**
 * Paritas loader detail legacy (`newsDetail(slug)` → gagal → `fallbackNewsDetail(slug)`), kecuali
 * slug yang tidak ada (404) → Not Found (BC-22). Gagal jaringan tanpa fallback → `detail: null`,
 * halaman mencoba lagi saat mount dan menampilkan error + "Coba lagi" seperti legacy.
 */
export async function newsDetailLoader({
  params,
}: LoaderFunctionArgs): Promise<NewsDetailLoaderData> {
  const slug = params.slug ?? "";
  let notFound = false;
  const detail = await loadPublicPage<ContractSchemas["PublicNewsDetail"] | null>(
    `/berita/${slug}`,
    () =>
      siteService.newsDetail(slug).catch((error: unknown) => {
        if (error instanceof ApiError && error.code === "NOT_FOUND") notFound = true;
        throw error;
      }),
    () => fallbackNewsDetail(slug),
    (page) => (page as { slug?: unknown }).slug === slug,
  );
  return { detail, notFound: notFound && detail === null };
}
