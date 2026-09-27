/**
 * Salinan teks per halaman publik — nilai identik dengan `head()` (pageSeo) dan `PageHero`
 * di route `_public.*.tsx` legacy. Dipakai halaman dan pending page (skeleton) yang sama.
 */

export const PAGE_SEO = {
  home: {
    title: "Indobraga - Solusi Produksi Garment Profesional untuk Bisnis Anda",
    description:
      "Profil perusahaan Indobraga, mitra produksi garment, apparel manufacturing, cetak kain custom, dan portofolio apparel multiproduk.",
    path: "/",
  },
  portfolio: {
    title: "Portofolio Produk Garment - Indobraga",
    description:
      "Portofolio produksi Indobraga untuk jersey, polo, wearpack, jaket, hoodie, seragam, kaos, dan merchandise custom.",
    path: "/portfolio",
  },
  facilities: {
    title: "Fasilitas Produksi - Indobraga",
    description:
      "Fasilitas produksi Indobraga mencakup garment, sublimation, press, DTF, pattern making, sample, QC, finishing, dan packing.",
    path: "/fasilitas",
  },
  gallery: {
    title: "Galeri Perusahaan - Indobraga",
    description:
      "Dokumentasi visual aktivitas produksi, fasilitas, dan event Indobraga dalam format galeri perusahaan.",
    path: "/galeri",
  },
  news: {
    title: "Berita - Indobraga",
    description:
      "Kabar terbaru Indobraga seputar fasilitas produksi, portofolio apparel, kapasitas manufaktur, dan kegiatan perusahaan.",
    path: "/berita",
  },
  contact: {
    title: "Kontak - Indobraga",
    description:
      "Hubungi tim marketing Indobraga untuk diskusi kebutuhan garment, cetak kain custom, kapasitas produksi, material, dan timeline order.",
    path: "/kontak",
  },
} as const;

export const PAGE_HERO = {
  portfolio: {
    kicker: "Portofolio",
    title: "Hasil produksi apparel dan merchandise multiproduk",
    subtitle:
      "Jersey, polo, wearpack, windrunner, hoodie, corporate uniform, t-shirt, dan bag merchandise dari portofolio Indobraga.",
  },
  facilities: {
    kicker: "Fasilitas",
    title: "Kapasitas produksi dan cetak kain custom",
    subtitle:
      "Fasilitas Indobraga mendukung produksi garment, sublimation, press, DTF, pattern making, sample, QC, finishing, dan packing.",
  },
  gallery: {
    kicker: "Galeri Perusahaan",
    title: "Dokumentasi Visual Indobraga",
    subtitle:
      "Aktivitas produksi, fasilitas, hasil produk, dan momen perusahaan dalam satu feed visual.",
  },
  news: {
    kicker: "Berita",
    title: "Kabar terbaru dari Indobraga",
    subtitle: "Update fasilitas, portofolio, kapasitas produksi, dan kegiatan perusahaan.",
  },
  contact: {
    kicker: "Kontak",
    title: "Mari bicarakan kebutuhan produksi Anda",
    subtitle:
      "Tim marketing Indobraga siap membantu diskusi kebutuhan garment, kapasitas, material, dan timeline produksi.",
  },
} as const;
