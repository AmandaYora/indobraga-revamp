import type { LoaderFunctionArgs } from "react-router-dom";
import { siteService } from "@/modules/site";
import { loadPublicPage } from "@/modules/site/lib/page-loader";
import {
  fallbackFacilities,
  fallbackGalleryList,
  fallbackHome,
  fallbackNewsDetail,
  fallbackNewsPage,
  fallbackPortfolioCategories,
  fallbackPortfolioList,
} from "@/modules/site/lib/fallbacks";
import { z } from "zod";

const pageSchema = z.coerce.number().int().min(1).catch(1).default(1);

function parsePage(url: string): number {
  return pageSchema.parse(new URL(url).searchParams.get("page"));
}

export async function homeLoader() {
  return loadPublicPage("/", () => siteService.home(), fallbackHome);
}

export async function portfolioLoader() {
  const fallbackList = fallbackPortfolioList(undefined, 24);
  const [categories, list] = await Promise.all([
    loadPublicPage(
      "/portfolio",
      () => siteService.portfolioCategories(),
      fallbackPortfolioCategories(),
    ),
    loadPublicPage("/portfolio", () => siteService.portfolio({ limit: 24 }), {
      items: fallbackList.items,
      meta: { limit: 24, next_cursor: null as string | null, has_more: fallbackList.has_more },
    }),
  ]);
  return { categories, list };
}

export async function facilitiesLoader() {
  return loadPublicPage("/fasilitas", () => siteService.facilities(), fallbackFacilities);
}

export async function galleryLoader() {
  const fallbackList = fallbackGalleryList(24);
  return loadPublicPage("/galeri", () => siteService.gallery({ limit: 24 }), {
    items: fallbackList.items,
    meta: { limit: 24, next_cursor: null as string | null, has_more: fallbackList.has_more },
  });
}

export async function newsListLoader({ request }: LoaderFunctionArgs) {
  const page = parsePage(request.url);
  const fallbackPage = fallbackNewsPage(page, 6);
  return loadPublicPage(`/berita?page=${page}`, () => siteService.news({ page, limit: 6 }), {
    items: fallbackPage.items,
    meta: fallbackPage.pagination,
  });
}

export async function newsDetailLoader({ request, params }: LoaderFunctionArgs) {
  const slug = params.slug ?? "";
  const page = parsePage(request.url);
  // Slug tidak ada → tandai notFound (BC-22); komponen merender Not Found.
  const detail = await loadPublicPage(
    `/berita/${slug}`,
    () =>
      siteService.newsDetail(slug).catch(() => {
        throw new Error("NOT_FOUND");
      }),
    fallbackNewsDetail(slug),
  ).catch(() => null);
  return { detail, page, slug, notFound: detail === null };
}
