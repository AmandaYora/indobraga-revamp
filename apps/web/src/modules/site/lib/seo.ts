/**
 * Helper SEO — HANYA fallback. Data SEO utama berasal dari API
 * (`GET /api/v1/public/seo?path=`) dan Pengaturan admin (BC-21).
 * Port `lib/seo.ts` legacy dengan nilai identik.
 */

export const SITE_URL = "https://indobraga.com";
export const SITE_NAME = "Indobraga";
export const COMPANY_NAME = "PT. Braga Indonesia Perkasa";
export const DEFAULT_TITLE = "Indobraga - Solusi Produksi Garment Profesional";
export const DEFAULT_DESCRIPTION =
  "Dipercaya oleh lebih dari 250+ bisnis. Indobraga melayani produksi jersey, polo, jaket, wearpack, seragam, bag merchandise, dan cetak kain custom.";

export function absoluteUrl(pathOrUrl = "/"): string {
  if (/^(https?:|data:)/.test(pathOrUrl)) return pathOrUrl;
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${SITE_URL}${path}`;
}

export function withSiteName(title: string): string {
  if (title.includes(SITE_NAME)) return title;
  return `${title} - ${SITE_NAME}`;
}

export interface PageSeoInput {
  title?: string | null;
  description?: string | null;
  path: string;
  image?: string | null;
  type?: string;
  noindex?: boolean;
}

export interface SeoTags {
  title: string;
  description: string;
  robots: string;
  canonical: string | null;
  og: { title: string; description: string; type: string; url: string; image?: string };
  twitter: { card: string; title: string; description: string; image?: string };
}

/** Bangun tag SEO fallback dari data halaman (tanpa duplikat canonical — BC-20). */
export function pageSeo(input: PageSeoInput): SeoTags {
  const title = withSiteName(input.title?.trim() || DEFAULT_TITLE);
  const description = input.description?.trim() || DEFAULT_DESCRIPTION;
  const url = absoluteUrl(input.path);
  const image = input.image ? absoluteUrl(input.image) : undefined;
  return {
    title,
    description,
    robots: input.noindex
      ? "noindex, nofollow"
      : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
    canonical: input.noindex ? null : url,
    og: {
      title,
      description,
      type: input.type ?? "website",
      url,
      ...(image ? { image } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image ? { image } : {}),
    },
  };
}

export function organizationJsonLd(settings?: {
  email?: string | null;
  phone?: string | null;
  instagram?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: COMPANY_NAME,
    alternateName: SITE_NAME,
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      email: settings?.email ?? "indobraga@gmail.com",
      telephone: settings?.phone ?? "+62-851-5870-0895",
      areaServed: "ID",
      availableLanguage: ["id"],
    },
    sameAs: [`https://www.instagram.com/${settings?.instagram ?? "indobraga"}`],
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    publisher: {
      "@type": "Organization",
      name: COMPANY_NAME,
    },
    inLanguage: "id-ID",
  };
}

export function articleJsonLd(input: {
  title: string;
  excerpt?: string | null;
  slug: string;
  date?: string | null;
  thumb?: string | null;
  category?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.excerpt ?? DEFAULT_DESCRIPTION,
    ...(input.thumb ? { image: absoluteUrl(input.thumb) } : {}),
    datePublished: input.date ?? undefined,
    dateModified: input.date ?? undefined,
    articleSection: input.category ?? undefined,
    mainEntityOfPage: absoluteUrl(`/berita/${input.slug}`),
    author: { "@type": "Organization", name: COMPANY_NAME },
    publisher: { "@type": "Organization", name: COMPANY_NAME },
    inLanguage: "id-ID",
  };
}
