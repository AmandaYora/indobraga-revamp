import {
  httpClient,
  type ApiData,
  type CursorMeta,
  type PageMeta,
} from "@/shared/services/http-client";
import { API } from "@/shared/services/api-endpoints";
import type { ContractSchemas } from "@/shared/types/contract";

async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const response = await httpClient.get<ApiData<T>>(url, { params });
  return (response.data as ApiData<T>).data;
}

export const siteService = {
  siteSettings(): Promise<ContractSchemas["PublicSiteSettings"]> {
    return get(API.public.siteSettings);
  },
  home(): Promise<ContractSchemas["PublicHome"]> {
    return get(API.public.home);
  },
  facilities(): Promise<ContractSchemas["PublicFacilities"]> {
    return get(API.public.facilities);
  },
  async portfolio(params?: {
    category?: string;
    category_slug?: string;
    cursor?: string;
    limit?: number;
  }) {
    const response = await httpClient.get<ApiData<ContractSchemas["PublicPortfolioItem"][]>>(
      API.public.portfolio,
      { params },
    );
    const body = response.data as ApiData<ContractSchemas["PublicPortfolioItem"][]>;
    return { items: body.data, meta: body.meta as CursorMeta | undefined };
  },
  portfolioCategories(): Promise<{ items: ContractSchemas["PublicPortfolioCategory"][] }> {
    return get(API.public.portfolioCategories);
  },
  async gallery(params?: { type?: string; cursor?: string; limit?: number }) {
    const response = await httpClient.get<ApiData<ContractSchemas["PublicGalleryItem"][]>>(
      API.public.gallery,
      { params },
    );
    const body = response.data as ApiData<ContractSchemas["PublicGalleryItem"][]>;
    return { items: body.data, meta: body.meta as CursorMeta | undefined };
  },
  async news(params?: { page?: number; limit?: number }) {
    const response = await httpClient.get<ApiData<ContractSchemas["PublicNewsItem"][]>>(
      API.public.news,
      { params },
    );
    const body = response.data as ApiData<ContractSchemas["PublicNewsItem"][]>;
    return { items: body.data, meta: body.meta as PageMeta | undefined };
  },
  newsDetail(slug: string): Promise<ContractSchemas["PublicNewsDetail"]> {
    return get(API.public.newsDetail(slug));
  },
  seo(route: string): Promise<ContractSchemas["SeoByPath"]> {
    return get(API.public.seoByRoute(route), undefined);
  },
  seoDefault(): Promise<ContractSchemas["SeoByPath"]> {
    return get(API.public.seo);
  },
};
