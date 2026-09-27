import type { ContractSchemas } from "@/shared/types/contract";

/**
 * Konten statis fallback — halaman tidak pernah kosong saat API gagal
 * (paritas `lib/public-fallbacks.ts` + `data/site.ts` legacy, nilai identik).
 * Bentuk data mengikuti envelope & field v1.
 */

type PublicHome = ContractSchemas["PublicHome"];
type PublicFacilities = ContractSchemas["PublicFacilities"];
type PublicSiteSettings = ContractSchemas["PublicSiteSettings"];
type PublicPortfolioItem = ContractSchemas["PublicPortfolioItem"];
type PublicPortfolioCategory = ContractSchemas["PublicPortfolioCategory"];
type PublicGalleryItem = ContractSchemas["PublicGalleryItem"];
type PublicNewsItem = ContractSchemas["PublicNewsItem"];
type PublicNewsDetail = ContractSchemas["PublicNewsDetail"];
type Portfolio = ContractSchemas["Portfolio"];

const FALLBACK_TIMESTAMP = "2026-05-12T08:30:00.000Z";

function contentBase(sortOrder: number) {
  return {
    sort_order: sortOrder,
    status: "published" as const,
    previous_status: null,
    archived_at: null,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  };
}

export const COMPANY = {
  brand: "Indobraga",
  legal: "PT. Braga Indonesia Perkasa",
  email: "indobraga@gmail.com",
  instagram: "indobraga",
  phone: "0851-5870-0895",
  whatsapp: "6285158700895",
  contactPerson: "Mahardika",
  contactRole: "Tim Marketing",
  address: "Jalan Babakan Tarogong No. 292, Kota Bandung",
} as const;

export const fallbackSettings: PublicSiteSettings = {
  brand: COMPANY.brand,
  legal_name: COMPANY.legal,
  email: COMPANY.email,
  phone: COMPANY.phone,
  whatsapp: COMPANY.whatsapp,
  instagram: COMPANY.instagram,
  contact_person: COMPANY.contactPerson,
  contact_role: COMPANY.contactRole,
  address: COMPANY.address,
  show_brand_text: false,
  logo_url: null,
  footer_logo_url: null,
  contact_hero_image_url: null,
  seo: { title: null, description: null, og_image_url: null },
};

const portfolios = [
  {
    id: 1,
    title: "Training Jersey Klub Profesional",
    category: "Jersey",
    desc: "Jersey training, home, away, dan third kit untuk kebutuhan tim olahraga profesional.",
  },
  {
    id: 2,
    title: "Official Polo Shirt",
    category: "Polo",
    desc: "Polo shirt official untuk komunitas, klub, brand, dan kebutuhan korporat.",
  },
  {
    id: 3,
    title: "Corporate Safety Wearpack",
    category: "Wearpack",
    desc: "Wearpack safety dan seragam lapangan dengan material kuat dan detail fungsional.",
  },
  {
    id: 4,
    title: "Windrunner & Sport Jacket",
    category: "Jaket",
    desc: "Jaket sport, varsity, bomber, dan windrunner untuk brand serta tim profesional.",
  },
  {
    id: 5,
    title: "Hoodie & Crewneck",
    category: "Hoodie",
    desc: "Hoodie, crewneck, dan apparel kasual dengan finishing rapi dan pilihan material premium.",
  },
  {
    id: 6,
    title: "Corporate Shirt & Uniform",
    category: "Seragam",
    desc: "Kemeja, seragam kantor, dan uniform custom untuk kebutuhan perusahaan dan institusi.",
  },
  {
    id: 7,
    title: "Official T-Shirt Merchandise",
    category: "Kaos",
    desc: "T-shirt official, event merchandise, dan apparel promosi untuk skala bisnis.",
  },
  {
    id: 8,
    title: "Totebag, Waistbag & Slingbag",
    category: "Tas",
    desc: "Backpack, slingbag, waistbag, walletbag, totebag, dan messenger bag custom.",
  },
] as const;

const machines = [
  {
    id: 1,
    name: "Atexco Model X Plus",
    metric: "5.000 m/hari",
    desc: "Mesin fabric sublimation berkapasitas besar untuk output konsisten dan standar internasional.",
  },
  {
    id: 2,
    name: "Press & DTF Production",
    metric: "7.000 m/hari",
    desc: "Kapasitas press 5.000 meter per hari dan DTF 2.000 meter per hari untuk kebutuhan printing.",
  },
  {
    id: 3,
    name: "Cutting & Pattern Area",
    metric: "In-house",
    desc: "Pattern making, cutting, dan sample development dikerjakan internal untuk menjaga presisi.",
  },
  {
    id: 4,
    name: "Sewing & Quality Control",
    metric: "QC ketat",
    desc: "Proses jahit, finishing, packing, dan quality control bertahap untuk produksi skala bisnis.",
  },
] as const;

const productionCapacity = [
  { product: "Jackets", value: "6.000", unit: "pcs / bulan" },
  { product: "T-shirts", value: "45.000", unit: "pcs / bulan" },
  { product: "Shirts", value: "10.000", unit: "pcs / bulan" },
  { product: "Backpack", value: "9.000", unit: "pcs / bulan" },
  { product: "Slingbag", value: "20.000", unit: "pcs / bulan" },
] as const;

const printingCapacity = [
  {
    label: "Sublim",
    value: "5.000",
    unit: "meter / hari",
    desc: "Mesin sublimasi Atexco Model X Plus dengan certified ink dan output konsisten.",
  },
  {
    label: "Press",
    value: "5.000",
    unit: "meter / hari",
    desc: "Heat press industrial untuk transfer print dengan presisi suhu dan tekanan.",
  },
  {
    label: "DTF",
    value: "2.000",
    unit: "meter / hari",
    desc: "Direct-to-Film printing untuk desain detail dengan warna tajam pada beragam material.",
  },
] as const;

const services = [
  "Full production package",
  "CMT",
  "Pattern making",
  "Garment sample",
  "Research & development",
  "Garment quality control",
  "Cetak Kain Custom",
  "Manufacturing consulting",
  "Apparel photography",
] as const;

const news = [
  {
    id: 1,
    slug: "atexco-model-x-plus",
    title: "Indobraga Perkuat Produksi dengan Atexco Model X Plus",
    category: "Fasilitas",
    date: "2026-04-22",
    excerpt:
      "Mesin fabric sublimation berkapasitas besar mendukung output konsisten untuk kebutuhan apparel skala bisnis.",
    content: [
      "Indobraga memperkuat lini cetak kain custom melalui mesin Atexco Model X Plus.",
      "Fasilitas ini mendukung kapasitas sublimasi hingga 5.000 meter per hari dengan standar tinta tersertifikasi.",
    ],
  },
  {
    id: 2,
    slug: "portfolio-sportswear-profesional",
    title: "Portofolio Sportswear untuk Klub dan Event Profesional",
    category: "Portofolio",
    date: "2026-03-10",
    excerpt:
      "Produksi jersey, tracksuit, windrunner, polo, dan merchandise olahraga menjadi salah satu kekuatan Indobraga.",
    content: [
      "Indobraga telah mengerjakan berbagai kebutuhan sportswear, mulai dari jersey, polo shirt, hingga tracksuit.",
      "Ragam portofolio ini memperkuat posisi Indobraga sebagai mitra produksi multiproduk untuk brand dan komunitas.",
    ],
  },
  {
    id: 3,
    slug: "kapasitas-produksi-90000-pcs",
    title: "Kapasitas Produksi Mencapai 90.000 Pcs per Bulan",
    category: "Produksi",
    date: "2026-02-18",
    excerpt:
      "Kapasitas produksi bulanan mencakup jackets, t-shirts, shirts, backpack, dan slingbag.",
    content: [
      "Kapasitas produksi Indobraga mencapai total 90.000 pcs per bulan untuk beberapa kategori utama.",
      "Angka ini menjadi fondasi layanan produksi bagi perusahaan, klub, institusi, dan brand apparel.",
    ],
  },
] as const;

export const partners = [
  { name: "Persib", segment: "Klub Sepak Bola" },
  { name: "Persebaya", segment: "Klub Sepak Bola" },
  { name: "Persija", segment: "Klub Sepak Bola" },
  { name: "Arema FC", segment: "Klub Sepak Bola" },
  { name: "Persis", segment: "Klub Sepak Bola" },
  { name: "Persela", segment: "Klub Sepak Bola" },
  { name: "Jakarta Electric PLN", segment: "Tim Olahraga" },
  { name: "Prawira Bandung", segment: "Klub Basket" },
  { name: "Satria Muda Pertamina", segment: "Klub Basket" },
  { name: "Dewa United", segment: "Klub Olahraga" },
  { name: "Rans Simba", segment: "Klub Olahraga" },
  { name: "FTL", segment: "Kebugaran" },
  { name: "Will Fitness", segment: "Kebugaran" },
  { name: "Celebrity Fitness", segment: "Kebugaran" },
  { name: "Sportama", segment: "Merek Olahraga" },
  { name: "Juaraga", segment: "Merek Olahraga" },
  { name: "Singo Edan Apparel", segment: "Pakaian" },
  { name: "ASA Active Wear", segment: "Pakaian" },
  { name: "ARK", segment: "Pakaian" },
  { name: "Homebreaks 3.4.7", segment: "Pakaian" },
  { name: "Oragle", segment: "Pakaian" },
  { name: "Astronkido", segment: "Pakaian" },
  { name: "Vlata", segment: "Tas & Pakaian" },
  { name: "PON XXI Aceh-Sumut 2024", segment: "Acara" },
  { name: "Premier Place", segment: "Perhotelan" },
  { name: "Corporate Client Mark", segment: "Korporasi" },
  { name: "Len", segment: "Korporasi" },
  { name: "Primavista", segment: "Korporasi" },
  { name: "Tupperware", segment: "Korporasi" },
  { name: "Freeport Indonesia", segment: "Korporasi" },
  { name: "Wirecard", segment: "Korporasi" },
  { name: "KAI", segment: "Transportasi" },
  { name: "BNI", segment: "Perbankan" },
  { name: "Bank BRI", segment: "Perbankan" },
  { name: "Gudang Garam", segment: "Korporasi" },
  { name: "Pertamina", segment: "Energi" },
  { name: "Universitas Singaperbangsa Karawang", segment: "Pendidikan" },
  { name: "Universitas Padjadjaran", segment: "Pendidikan" },
  { name: "Universitas Pasundan", segment: "Pendidikan" },
] as const;

const strengths = [
  { label: "Kapasitas Produksi", value: "90K", suffix: "pcs / bulan" },
  { label: "Pengalaman Garment", value: "14+", suffix: "tahun produksi" },
  { label: "Kapasitas Printing", value: "12K", suffix: "meter / hari" },
  { label: "Berdiri Sejak", value: "2010", suffix: "asal Indonesia" },
] as const;

const gallery = [
  {
    id: 1,
    type: "image" as const,
    caption: "Lini sublimasi Atexco Model X Plus dalam operasi harian.",
    date: "2026-04-20",
  },
  {
    id: 2,
    type: "image" as const,
    caption: "Tim sewing menyelesaikan order jersey klub profesional.",
    date: "2026-04-12",
  },
  {
    id: 3,
    type: "image" as const,
    caption: "Proses cutting & pattern in-house untuk presisi produksi.",
    date: "2026-04-05",
  },
  {
    id: 4,
    type: "image" as const,
    caption: "Sample windrunner siap untuk approval klien brand.",
    date: "2026-03-28",
  },
  {
    id: 5,
    type: "image" as const,
    caption: "Finishing hoodie premium sebelum tahap quality control.",
    date: "2026-03-22",
  },
  {
    id: 6,
    type: "video" as const,
    caption: "Cuplikan area press & DTF berkapasitas 7.000 m/hari.",
    date: "2026-03-15",
  },
  {
    id: 7,
    type: "image" as const,
    caption: "Family gathering tim produksi Indobraga 2026.",
    date: "2026-03-08",
  },
  {
    id: 8,
    type: "image" as const,
    caption: "Packing polo shirt official untuk pengiriman korporat.",
    date: "2026-02-26",
  },
  {
    id: 9,
    type: "image" as const,
    caption: "Display merchandise event partner Indobraga.",
    date: "2026-02-14",
  },
] as const;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toPortfolio(item: (typeof portfolios)[number], index: number): Portfolio {
  return {
    id: item.id,
    title: item.title,
    slug: slugify(item.title),
    category_id: null,
    category: item.category,
    short_description: item.desc,
    description: null,
    image_media_id: null,
    images: [],
    is_featured: true,
    ...contentBase(index + 1),
  };
}

export const fallbackHome: PublicHome = {
  hero: {
    title: "Produksi Garment dan Sublim Skala Bisnis",
    subtitle:
      "Indobraga membantu brand, komunitas, dan perusahaan memproduksi apparel dan merchandise multiproduk dengan standar industri.",
    primary_cta: { label: "Konsultasi Produksi", url: "/kontak" },
    slides: [
      {
        id: 1,
        label: "Garment",
        title: "Produksi Garment Skala Bisnis",
        metric: "90K pcs/bulan",
        alt_text: "Produksi garment",
        ...contentBase(1),
      },
      {
        id: 2,
        label: "Sublim",
        title: "Cetak Kain Custom Presisi",
        metric: "5K meter/hari",
        alt_text: "Cetak kain sublim",
        ...contentBase(2),
      },
    ],
  },
  partners: partners.slice(0, 12).map((partner, index) => ({
    id: index + 1,
    name: partner.name,
    segment: partner.segment,
    logo_media_id: null,
    ...contentBase(index + 1),
  })),
  strengths: strengths.map((strength, index) => ({
    id: index + 1,
    label: strength.label,
    value: strength.value,
    suffix: strength.suffix,
    ...contentBase(index + 1),
  })),
  featured_portfolios: portfolios.slice(0, 6).map(toPortfolio),
  facilities_summary: {
    machines: machines.slice(0, 3).map((machine, index) => ({
      id: machine.id,
      name: machine.name,
      slug: slugify(machine.name),
      metric: machine.metric,
      description: machine.desc,
      media_file_id: null,
      ...contentBase(index + 1),
    })),
    printing_capacities: printingCapacity.map((capacity, index) => ({
      id: index + 1,
      label: capacity.label,
      value: capacity.value,
      unit: capacity.unit,
      description: capacity.desc,
      media_file_id: null,
      ...contentBase(index + 1),
    })),
    production_capacities: productionCapacity.map((capacity, index) => ({
      id: index + 1,
      product: capacity.product,
      value: capacity.value,
      unit: capacity.unit,
      ...contentBase(index + 1),
    })),
    services: services.slice(0, 9).map((name, index) => ({
      id: index + 1,
      name,
      ...contentBase(index + 1),
    })),
  },
  latest_news: news.map((item, index) => ({
    id: item.id,
    title: item.title,
    slug: item.slug,
    category: item.category,
    excerpt: item.excerpt,
    content: [...item.content],
    thumbnail_media_file_id: null,
    og_image_media_file_id: null,
    published_at: `${item.date}T08:00:00.000Z`,
    seo_title: null,
    seo_description: null,
    ...contentBase(index + 1),
  })),
};

export const fallbackFacilities: PublicFacilities = {
  strengths: [...fallbackHome.strengths],
  machines: machines.map((machine, index) => ({
    id: machine.id,
    name: machine.name,
    slug: slugify(machine.name),
    metric: machine.metric,
    description: machine.desc,
    media_file_id: null,
    ...contentBase(index + 1),
  })),
  printing_capacities: [...fallbackHome.facilities_summary.printing_capacities],
  production_capacities: [...fallbackHome.facilities_summary.production_capacities],
  services: [...fallbackHome.facilities_summary.services],
};

export function fallbackPortfolioCategories(): { items: PublicPortfolioCategory[] } {
  const unique = [...new Set(portfolios.map((item) => item.category))];
  return {
    items: unique.map((name, index) => ({
      id: index + 1,
      name,
      slug: slugify(name),
      count: portfolios.filter((item) => item.category === name).length,
    })),
  };
}

export function fallbackPortfolioList(
  category?: string,
  limit = 24,
): { items: PublicPortfolioItem[]; next_cursor: null; has_more: boolean } {
  const filtered =
    !category || category === "Semua" || category === "all"
      ? [...portfolios]
      : portfolios.filter(
          (item) => item.category === category || slugify(item.category) === category,
        );
  const items: PublicPortfolioItem[] = filtered.slice(0, limit).map((item) => ({
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
  return { items, next_cursor: null, has_more: filtered.length > items.length };
}

export function fallbackGalleryList(limit = 24): {
  items: PublicGalleryItem[];
  next_cursor: null;
  has_more: boolean;
} {
  const items: PublicGalleryItem[] = gallery.slice(0, limit).map((item) => ({
    id: item.id,
    type: item.type,
    thumbnail_url: null,
    media_url: null,
    caption: item.caption,
    alt_text: item.caption,
    published_at: `${item.date}T08:00:00.000Z`,
  }));
  return { items, next_cursor: null, has_more: gallery.length > items.length };
}

export function fallbackNewsPage(
  page = 1,
  limit = 6,
): {
  items: PublicNewsItem[];
  pagination: { page: number; limit: number; total: number; total_pages: number };
} {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 6;
  const total = news.length;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const current = Math.min(safePage, totalPages);
  const items: PublicNewsItem[] = news
    .slice((current - 1) * safeLimit, current * safeLimit)
    .map((item) => ({
      id: item.id,
      title: item.title,
      slug: item.slug,
      category: item.category,
      thumbnail_url: null,
      excerpt: item.excerpt,
      published_at: `${item.date}T08:00:00.000Z`,
    }));
  return { items, pagination: { page: current, limit: safeLimit, total, total_pages: totalPages } };
}

export function fallbackNewsDetail(slug: string): PublicNewsDetail | null {
  const item = news.find((entry) => entry.slug === slug);
  if (!item) return null;
  return {
    id: item.id,
    title: item.title,
    slug: item.slug,
    category: item.category,
    thumbnail_url: null,
    excerpt: item.excerpt,
    published_at: `${item.date}T08:00:00.000Z`,
    content: [...item.content],
    seo: { title: null, description: null, canonical_url: null, og_image_url: null },
  };
}
