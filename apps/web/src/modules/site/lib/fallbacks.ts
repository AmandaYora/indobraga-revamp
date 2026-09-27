import type { ContractSchemas } from "@/shared/types/contract";
import type { CursorList, PageList } from "@/modules/site/services/site.service";
import { absoluteUrl } from "@/modules/site/lib/seo";
import {
  COMPANY,
  gallery,
  machines,
  news,
  partners,
  portfolios,
  printingCapacity,
  productionCapacity,
  services,
  strengths,
} from "@/modules/site/lib/site-data";

/**
 * Konten fallback saat API gagal — port `lib/public-fallbacks.ts` +
 * `components/public/site-settings.ts` legacy (nilai identik), dipetakan ke read model publik v1
 * sehingga halaman tidak pernah kosong.
 */

type PublicHome = ContractSchemas["PublicHome"];
type PublicFacilities = ContractSchemas["PublicFacilities"];
type PublicSiteSettings = ContractSchemas["PublicSiteSettings"];
type PublicPortfolioItem = ContractSchemas["PublicPortfolioItem"];
type PublicPortfolioCategory = ContractSchemas["PublicPortfolioCategory"];
type PublicGalleryItem = ContractSchemas["PublicGalleryItem"];
type PublicNewsItem = ContractSchemas["PublicNewsItem"];
type PublicNewsDetail = ContractSchemas["PublicNewsDetail"];

export { COMPANY, partners };

export const fallbackSettings: PublicSiteSettings = {
  brand: "Indobraga",
  legal_name: "PT. Braga Indonesia Perkasa",
  email: "indobraga@gmail.com",
  phone: "0851-5870-0895",
  whatsapp: "6285158700895",
  instagram: "indobraga",
  contact_person: "Mahardika",
  contact_role: "Tim Marketing",
  address: "Jalan Babakan Tarogong No. 292, Kota Bandung",
  show_brand_text: false,
  logo_url: null,
  footer_logo_url: null,
  contact_hero_image_url: null,
  seo: { title: null, description: null, og_image_url: null },
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const fallbackStrengths: ContractSchemas["PublicStrength"][] = strengths.map((item, index) => ({
  id: index + 1,
  label: item.label,
  value: item.value,
  suffix: item.suffix,
}));

const fallbackPortfolioItems: PublicPortfolioItem[] = portfolios.map((item) => ({
  id: item.id,
  title: item.title,
  slug: slugify(item.title),
  category: item.category,
  category_slug: slugify(item.category),
  thumbnail_url: null,
  medium_url: null,
  alt_text: item.title,
  short_description: item.desc,
  images: [],
}));

const fallbackMachines: ContractSchemas["PublicMachine"][] = machines.map((item) => ({
  id: item.id,
  name: item.name,
  slug: slugify(item.name),
  metric: item.metric,
  description: item.desc,
  image_url: null,
  alt_text: item.name,
}));

const fallbackPrintingCapacities: ContractSchemas["PublicPrintingCapacity"][] =
  printingCapacity.map((item, index) => ({
    id: index + 1,
    label: item.label,
    value: item.value,
    unit: item.unit,
    description: item.desc,
    image_url: null,
    alt_text: item.label,
  }));

const fallbackProductionCapacities: ContractSchemas["PublicProductionCapacity"][] =
  productionCapacity.map((item, index) => ({
    id: index + 1,
    product: item.product,
    value: item.value,
    unit: item.unit,
  }));

const fallbackServices: ContractSchemas["PublicService"][] = services.map((name, index) => ({
  id: index + 1,
  name,
}));

const fallbackNewsItems: PublicNewsItem[] = news.map((item) => ({
  id: item.id,
  title: item.title,
  slug: item.slug,
  category: item.category,
  thumbnail_url: null,
  excerpt: item.excerpt,
  published_at: item.date,
}));

const fallbackGalleryItems: PublicGalleryItem[] = gallery.map((item) => ({
  id: item.id,
  type: item.type,
  thumbnail_url: null,
  media_url: null,
  caption: item.caption,
  alt_text: item.caption,
  published_at: item.date,
}));

export const fallbackHome: PublicHome = {
  hero: {
    title: "Produksi Garment dan Sublim Skala Bisnis",
    subtitle:
      "Indobraga membantu brand, komunitas, dan perusahaan memproduksi apparel siap pakai, mulai dari pattern, cutting, sewing, hingga sublimasi kain dengan output konsisten.",
    primary_cta: { label: "Konsultasi Produksi", url: "/kontak" },
    slides: [],
  },
  partners: [],
  strengths: fallbackStrengths,
  featured_portfolios: fallbackPortfolioItems,
  facilities_summary: {
    machines: fallbackMachines,
    printing_capacities: fallbackPrintingCapacities,
    production_capacities: fallbackProductionCapacities,
    services: fallbackServices,
  },
  latest_news: fallbackNewsItems,
};

export const fallbackFacilities: PublicFacilities = {
  strengths: fallbackStrengths,
  machines: fallbackMachines,
  printing_capacities: fallbackPrintingCapacities,
  production_capacities: fallbackProductionCapacities,
  services: fallbackServices,
};

export function fallbackPortfolioList(
  category?: string,
  limit = 24,
): CursorList<PublicPortfolioItem> {
  const filtered =
    category && category !== "Semua" && category !== "all"
      ? fallbackPortfolioItems.filter(
          (item) => item.category === category || item.category_slug === category,
        )
      : fallbackPortfolioItems;
  const items = filtered.slice(0, limit);

  return {
    items,
    meta: { limit, next_cursor: null, has_more: filtered.length > items.length },
  };
}

export function fallbackPortfolioCategories(): { items: PublicPortfolioCategory[] } {
  const categories = new Map<string, PublicPortfolioCategory>();

  fallbackPortfolioItems.forEach((item) => {
    const slug = item.category_slug ?? slugify(item.category);
    const current = categories.get(slug);
    categories.set(slug, {
      id: current?.id ?? categories.size + 1,
      name: current?.name ?? item.category,
      slug,
      count: (current?.count ?? 0) + 1,
    });
  });

  return { items: Array.from(categories.values()) };
}

export function fallbackGalleryList(limit = 24): CursorList<PublicGalleryItem> {
  const items = fallbackGalleryItems.slice(0, limit);

  return {
    items,
    meta: { limit, next_cursor: null, has_more: fallbackGalleryItems.length > items.length },
  };
}

export function fallbackNewsPage(page = 1, limit = 6): Required<PageList<PublicNewsItem>> {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 6;
  const totalPages = Math.max(1, Math.ceil(fallbackNewsItems.length / safeLimit));
  const currentPage = Math.min(safePage, totalPages);
  const start = (currentPage - 1) * safeLimit;

  return {
    items: fallbackNewsItems.slice(start, start + safeLimit),
    meta: {
      page: currentPage,
      limit: safeLimit,
      total: fallbackNewsItems.length,
      total_pages: totalPages,
    },
  };
}

export function fallbackNewsDetail(slug: string): PublicNewsDetail | null {
  const item = news.find((candidate) => candidate.slug === slug);

  if (!item) {
    return null;
  }

  return {
    id: item.id,
    title: item.title,
    slug: item.slug,
    category: item.category,
    thumbnail_url: null,
    excerpt: item.excerpt,
    published_at: item.date,
    content: [...item.content],
    seo: {
      title: item.title,
      description: item.excerpt,
      canonical_url: absoluteUrl(`/berita/${item.slug}`),
      og_image_url: null,
    },
  };
}
