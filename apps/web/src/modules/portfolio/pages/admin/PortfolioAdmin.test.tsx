// @vitest-environment jsdom
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Outlet } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Toaster } from "sonner";
import PortfolioAdminPage from "@/modules/portfolio/pages/admin/PortfolioAdminPage";
import PortfolioCategoriesAdminPage from "@/modules/portfolio/pages/admin/PortfolioCategoriesAdminPage";
import { contentService } from "@/modules/content";
import { loginAs, renderWithRoutes } from "@/test/utils";

function portfolioRoute(element: React.ReactNode, path: string) {
  return renderWithRoutes(
    [
      {
        path: "/",
        element: (
          <>
            <Outlet />
            <Toaster />
          </>
        ),
        children: [{ path: path.slice(1), element }],
      },
    ],
    path,
  );
}

describe("FE-C12 portofolio admin", () => {
  it("unggulan + gambar pertama = sampul + tayang sukses", async () => {
    await loginAs();
    await contentService.create("portfolios", {
      title: "Unggulan Uji",
      category_id: 1,
      short_description: "Deskripsi",
      media_file_ids: [11],
      is_featured: true,
      status: "published",
    });
    portfolioRoute(<PortfolioAdminPage />, "/admin/portfolio");
    await waitFor(() => expect(screen.getByText("Portofolio Produk")).toBeInTheDocument());
    expect(await screen.findAllByText("Unggulan di Beranda")).not.toHaveLength(0);
  });

  it("state error + coba lagi", async () => {
    await loginAs();
    const { failNextRequest } = await import("@/mocks/server");
    failNextRequest({ status: 500, code: "INTERNAL_ERROR", message: "Simulasi gagal." });
    portfolioRoute(<PortfolioAdminPage />, "/admin/portfolio");
    expect(await screen.findByText("Coba lagi")).toBeInTheDocument();
  });
});

describe("FE-C11 kategori portofolio", () => {
  it("state error + coba lagi", async () => {
    await loginAs();
    const { failNextRequest } = await import("@/mocks/server");
    failNextRequest({ status: 500, code: "INTERNAL_ERROR", message: "Simulasi gagal." });
    portfolioRoute(<PortfolioCategoriesAdminPage />, "/admin/portfolio-categories");
    expect(await screen.findByText("Coba lagi")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByText("Coba lagi"));
    await waitFor(() => expect(screen.getByText("Kategori Portofolio")).toBeInTheDocument());
  });
});
