import { partners } from "@/modules/site/lib/site-data";

/** Konstanta beranda — port 1:1 bagian atas `routes/_public.index.tsx` legacy. */

export const clientLogoSizeClass = {
  badge:
    "max-h-[3.5rem] max-w-[4.5rem] sm:max-h-[4rem] sm:max-w-[5rem] lg:max-h-[4.5rem] lg:max-w-[5.5rem]",
  stacked:
    "max-h-[3.25rem] max-w-[5.75rem] sm:max-h-[3.75rem] sm:max-w-[6.5rem] lg:max-h-[4.25rem] lg:max-w-[7.25rem]",
  wide: "max-h-[2.5rem] max-w-[6.25rem] sm:max-h-[2.875rem] sm:max-w-[7.25rem] lg:max-h-[3.25rem] lg:max-w-[8.75rem]",
} as const;

export type ClientLogoSize = keyof typeof clientLogoSizeClass;

export type TrustedClientLogo = {
  name: string;
  image?: string | null;
  size: ClientLogoSize;
};

export const trustedClientLogos: TrustedClientLogo[] = partners.slice(0, 40).map((partner) => ({
  name: partner.name,
  image: null,
  size: "wide" as ClientLogoSize,
}));

export type HeroSlideView = {
  label: string;
  title: string;
  metric: string;
  image: string | null;
  alt: string;
};

export const fallbackHeroSlides: readonly HeroSlideView[] = [
  {
    label: "Garment Production",
    title: "Garment",
    metric: "90K pcs/bulan",
    image: null,
    alt: "Lini produksi garment Indobraga untuk sportswear dan corporate apparel",
  },
  {
    label: "Cetak Kain Custom",
    title: "Sublim",
    metric: "5K meter/hari",
    image: null,
    alt: "Mesin sublimasi kain Indobraga untuk cetak kain custom",
  },
];

export const HERO_SUBTITLE_FALLBACK =
  "Indobraga membantu brand, komunitas, dan perusahaan memproduksi apparel siap pakai, mulai dari pattern, cutting, sewing, hingga sublimasi kain dengan output konsisten.";
