// @vitest-environment jsdom
import { screen, waitFor } from "@testing-library/react";
import { Outlet } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Toaster } from "sonner";
import HeroAdminPage from "@/modules/profile/pages/admin/HeroAdminPage";
import PartnersAdminPage from "@/modules/profile/pages/admin/PartnersAdminPage";
import StrengthAdminPage from "@/modules/profile/pages/admin/StrengthAdminPage";
import ServicesAdminPage from "@/modules/profile/pages/admin/ServicesAdminPage";
import MachinesAdminPage from "@/modules/profile/pages/admin/MachinesAdminPage";
import PortfolioCategoriesAdminPage from "@/modules/portfolio/pages/admin/PortfolioCategoriesAdminPage";
import NewsAdminPage from "@/modules/news/pages/admin/NewsAdminPage";
import { contentService } from "@/modules/content";
import { loginAs, renderWithRoutes } from "@/test/utils";

const PAGES: {
  path: string;
  element: React.ReactNode;
  titles: string[];
  seeds: [string, Record<string, unknown>][];
  expectDash: boolean;
}[] = [
  {
    path: "admin/hero",
    element: <HeroAdminPage />,
    titles: ["Konten Beranda", "Slide Hero"],
    expectDash: true,
    seeds: [
      ["hero", { title: "Hero Minimal" }],
      ["hero-slides", { title: "Slide Minimal" }],
    ],
  },
  {
    path: "admin/partners",
    element: <PartnersAdminPage />,
    titles: ["Logo Klien"],
    expectDash: true,
    seeds: [["partners", { name: "Klien Minimal" }]],
  },
  {
    path: "admin/strength",
    element: <StrengthAdminPage />,
    titles: ["Kekuatan Produksi"],
    expectDash: false,
    seeds: [["production-strengths", { label: "L", value: "V" }]],
  },
  {
    path: "admin/services",
    element: <ServicesAdminPage />,
    titles: ["Daftar Layanan"],
    expectDash: false,
    seeds: [["services", { name: "Layanan Minimal" }]],
  },
  {
    path: "admin/machines",
    element: <MachinesAdminPage />,
    titles: ["Mesin & Area Produksi", "Kapasitas Cetak", "Kapasitas Produksi"],
    expectDash: true,
    seeds: [
      ["machines", { name: "Mesin Minimal" }],
      ["printing-capacities", { label: "C", value: "1", unit: "m" }],
      ["production-capacities", { product: "P", value: "1", unit: "pcs" }],
    ],
  },
  {
    path: "admin/portfolio-categories",
    element: <PortfolioCategoriesAdminPage />,
    titles: ["Kategori Portofolio"],
    expectDash: false,
    seeds: [["portfolio-categories", { name: "Kategori Minimal" }]],
  },
  {
    path: "admin/news",
    element: <NewsAdminPage />,
    titles: ["Berita"],
    expectDash: true,
    seeds: [["news", { title: "Berita Minimal" }]],
  },
];

/** Setiap halaman konten admin me-render manager-nya (FE-C10/C11/C13/C15). */
describe("halaman konten admin", () => {
  for (const page of PAGES) {
    it(
      page.path,
      async () => {
        await loginAs();
        // Item minimal (field opsional null) agar cabang fallback "—" teruji,
        // plus satu item kosong per resource untuk sisi null semua kolom.
        for (const [resource, payload] of page.seeds) {
          await contentService.create(resource, { ...payload, status: "draft" });
        }
        for (const resource of [...new Set(page.seeds.map(([name]) => name))]) {
          await contentService.create(resource, { status: "draft" });
        }
        renderWithRoutes(
          [
            {
              path: "/",
              element: (
                <>
                  <Outlet />
                  <Toaster />
                </>
              ),
              children: [{ path: page.path, element: page.element }],
            },
          ],
          `/${page.path}`,
        );
        for (const title of page.titles) {
          await waitFor(() => expect(screen.getByText(title)).toBeInTheDocument(), {
            timeout: 8000,
          });
        }
        // Kolom fallback untuk field kosong.
        if (page.expectDash) {
          expect(await screen.findAllByText("—")).not.toHaveLength(0);
        }
      },
      20000,
    );
  }
});
