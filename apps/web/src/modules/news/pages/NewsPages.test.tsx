// @vitest-environment jsdom
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import NewsListPage from "@/modules/news/pages/NewsListPage";
import NewsDetailPage from "@/modules/news/pages/NewsDetailPage";
import { newsDetailLoader, newsListLoader } from "@/modules/site/services/public.loaders";
import { renderWithRoutes } from "@/test/utils";

describe("FE-N01/N02 berita", () => {
  it("grid + pagination + link mempertahankan page", async () => {
    const user = userEvent.setup();
    const { router } = renderWithRoutes(
      [
        { path: "/berita", loader: newsListLoader, Component: NewsListPage },
        { path: "/berita/:slug", loader: newsDetailLoader, Component: NewsDetailPage },
      ],
      "/berita",
    );
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument());
    const links = screen.getAllByRole("link");
    const article = links.find((link) => link.getAttribute("href")?.startsWith("/berita/"));
    expect(article).toBeDefined();
    // Link daftar membawa ?page=1 (paritas legacy).
    expect(article!.getAttribute("href")).toContain("page=1");
    await user.click(article!);
    await waitFor(() => expect(router.state.location.pathname).toContain("/berita/"));
    // Link kembali mempertahankan page.
    const back = await screen.findByText("Kembali");
    expect(back.closest("a")).toHaveAttribute("href", "/berita");
  });

  it("slug asing → Not Found (BC-22)", async () => {
    renderWithRoutes(
      [{ path: "/berita/:slug", loader: newsDetailLoader, Component: NewsDetailPage }],
      "/berita/slug-tidak-ada-xyz",
    );
    await waitFor(() => expect(screen.getByText("404")).toBeInTheDocument());
  });

  it("API gagal total → Not Found (fallback null)", async () => {
    const { failNextRequest } = await import("@/mocks/server");
    failNextRequest({ status: 500, code: "INTERNAL_ERROR", message: "Simulasi gagal." });
    renderWithRoutes(
      [{ path: "/berita/:slug", loader: newsDetailLoader, Component: NewsDetailPage }],
      "/berita/kapasitas-produksi-90000-pcs",
    );
    // Loader fallback statis menutupi kegagalan API (halaman tidak kosong).
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument());
  });

  it("pagination bernomor via ?page (2 halaman)", async () => {
    const user = userEvent.setup();
    const { server } = await import("@/mocks/server");
    const { http, HttpResponse } = await import("msw");
    const item = (id: number) => ({
      id,
      title: `Berita ${id}`,
      slug: `berita-${id}`,
      category: "Umum",
      thumbnail_url: null,
      excerpt: `Ringkasan ${id}`,
      published_at: "2026-01-01T00:00:00.000Z",
    });
    server.use(
      http.get("*/api/v1/public/news", ({ request }) => {
        const url = new URL(request.url);
        const page = Number(url.searchParams.get("page") ?? 1);
        const items = page === 1 ? [1, 2, 3, 4, 5, 6].map(item) : [item(7)];
        return HttpResponse.json({
          success: true,
          message: "Data berhasil diambil.",
          data: items,
          meta: { page, limit: 6, total: 7, total_pages: 2 },
        });
      }),
    );
    const { router } = renderWithRoutes(
      [
        { path: "/berita", loader: newsListLoader, Component: NewsListPage },
        { path: "/berita/:slug", loader: newsDetailLoader, Component: NewsDetailPage },
      ],
      "/berita",
    );
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument());
    const nav = await screen.findByLabelText("Pagination berita");
    expect(nav.textContent).toContain("2");
    await user.click(screen.getByText("2"));
    await waitFor(() => expect(router.state.location.search).toContain("page=2"));
    expect(await screen.findByText("Berita 7")).toBeInTheDocument();
    // Kembali ke halaman 1 (setSearchParams kosong).
    await user.click(screen.getByText("1"));
    await waitFor(() => expect(router.state.location.search).not.toContain("page="));
  });

  it("SEO artikel: og:type=article + JSON-LD", async () => {
    renderWithRoutes(
      [{ path: "/berita/:slug", loader: newsDetailLoader, Component: NewsDetailPage }],
      "/berita/kapasitas-produksi-90000-pcs",
    );
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument());
    expect(document.querySelector('meta[property="og:type"]')).toHaveAttribute(
      "content",
      "article",
    );
    expect(document.querySelector('meta[property="article:section"]')).not.toBeNull();
    const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')].map(
      (node) => node.textContent ?? "",
    );
    expect(jsonLd.some((text) => text.includes('"@type":"Article"'))).toBe(true);
  });
});
