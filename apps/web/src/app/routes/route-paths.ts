export const ROUTE_PATHS = {
  home: "/",
  portfolio: "/portfolio",
  facilities: "/fasilitas",
  gallery: "/galeri",
  news: "/berita",
  contact: "/kontak",
  login: "/login",
  admin: "/admin",
  adminHero: "/admin/hero",
  adminPartners: "/admin/partners",
  adminStrength: "/admin/strength",
  adminPortfolio: "/admin/portfolio",
  adminPortfolioCategories: "/admin/portfolio-categories",
  adminMachines: "/admin/machines",
  adminServices: "/admin/services",
  adminGallery: "/admin/gallery",
  adminNews: "/admin/news",
  adminInquiries: "/admin/inquiries",
  adminWhatsapp: "/admin/whatsapp",
  adminEmailAccounts: "/admin/email-accounts",
  adminEmailBlast: "/admin/email-blast",
  adminEmailTemplates: "/admin/email-templates",
  adminEmailHistory: "/admin/email-history",
  adminSettings: "/admin/settings",
  adminUsers: "/admin/users",
} as const;

/** Link kembali dari detail berita mempertahankan `page` (paritas legacy). */
export function newsDetailPath(slug: string, page?: number): string {
  return page && page > 1 ? `/berita/${slug}?page=${page}` : `/berita/${slug}`;
}

export function newsListPath(page?: number): string {
  return page && page > 1 ? `/berita?page=${page}` : "/berita";
}

export function loginPath(redirect?: string): string {
  return redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : "/login";
}
