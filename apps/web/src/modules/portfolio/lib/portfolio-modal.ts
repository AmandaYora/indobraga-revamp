import type { ContractSchemas } from "@/shared/types/contract";

export interface PortfolioModalItem {
  id: number;
  title: string;
  category?: string | null;
  short_description?: string | null;
  images: { url: string; alt?: string | null }[];
  cover?: string | null;
}

export function toModalItem(item: ContractSchemas["PublicPortfolioItem"]): PortfolioModalItem {
  const images = (item.images ?? []).map((url) => ({ url, alt: item.alt_text ?? item.title }));
  if (images.length === 0 && (item.medium_url ?? item.thumbnail_url)) {
    images.push({
      url: (item.medium_url ?? item.thumbnail_url) as string,
      alt: item.alt_text ?? item.title,
    });
  }
  return {
    id: item.id,
    title: item.title,
    category: item.category,
    short_description: item.short_description,
    images,
    cover: item.medium_url ?? item.thumbnail_url,
  };
}
