import { ROUTE_PATHS } from "@/app/routes/route-paths";

export interface AdminMenuLink {
  label: string;
  to: string;
  exact?: boolean;
}

export interface AdminMenuGroup {
  label: string;
  links: AdminMenuLink[];
}

/**
 * Menu sidebar admin — 5 grup / 18 link (paritas `AdminLayout` legacy;
 * PLAN-02 §2.8 FE-A01 menyebut "16 link" tetapi kode legacy memuat 18 —
 * konflik dilaporkan, baseline legacy menang).
 */
export const ADMIN_MENU: AdminMenuGroup[] = [
  {
    label: "Ringkasan",
    links: [{ label: "Ringkasan", to: ROUTE_PATHS.admin, exact: true }],
  },
  {
    label: "Konten Website",
    links: [
      { label: "Konten Beranda", to: ROUTE_PATHS.adminHero },
      { label: "Logo Klien", to: ROUTE_PATHS.adminPartners },
      { label: "Kekuatan Produksi", to: ROUTE_PATHS.adminStrength },
      { label: "Portofolio Produk", to: ROUTE_PATHS.adminPortfolio },
      { label: "Kategori Portofolio", to: ROUTE_PATHS.adminPortfolioCategories },
      { label: "Mesin & Fasilitas", to: ROUTE_PATHS.adminMachines },
      { label: "Daftar Layanan", to: ROUTE_PATHS.adminServices },
      { label: "Galeri Perusahaan", to: ROUTE_PATHS.adminGallery },
      { label: "Berita", to: ROUTE_PATHS.adminNews },
    ],
  },
  {
    label: "Prospek",
    links: [
      { label: "Pesan Kontak", to: ROUTE_PATHS.adminInquiries },
      { label: "Prospek WhatsApp", to: ROUTE_PATHS.adminWhatsapp },
    ],
  },
  {
    label: "Email",
    links: [
      { label: "Akun Pengirim Email", to: ROUTE_PATHS.adminEmailAccounts },
      { label: "Kirim Email", to: ROUTE_PATHS.adminEmailBlast },
      { label: "Kelola Template", to: ROUTE_PATHS.adminEmailTemplates },
      { label: "Riwayat Email", to: ROUTE_PATHS.adminEmailHistory },
    ],
  },
  {
    label: "Pengaturan",
    links: [
      { label: "Pengaturan Website", to: ROUTE_PATHS.adminSettings },
      { label: "Pengguna Admin", to: ROUTE_PATHS.adminUsers },
    ],
  },
];

export const ALL_ADMIN_LINKS: AdminMenuLink[] = ADMIN_MENU.flatMap((group) => group.links);
