// @vitest-environment jsdom
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import HomePage from "@/modules/home/pages/HomePage";
import { homeLoader } from "@/modules/site/services/public.loaders";
import { renderWithRoutes } from "@/test/utils";

describe("FE-H01/H02/H03 beranda", () => {
  it("hero cross-fade, stat, carousel, CTA", async () => {
    const { router } = renderWithRoutes([{ path: "/", loader: homeLoader, Component: HomePage }]);
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument());
    expect(router.state.location.pathname).toBe("/");

    // Hero: badge + 2 slide cross-fade 9 dtk + CTA.
    expect(screen.getByText(/Garment & sublim specialist sejak 2010/)).toBeInTheDocument();
    const hero = screen.getByRole("heading", { level: 1 }).closest("section");
    expect(hero?.querySelector(".animate-hero-slide-one")).not.toBeNull();
    expect(hero?.querySelector(".animate-hero-slide-two")).not.toBeNull();
    expect(screen.getByText("Konsultasi Produksi")).toHaveAttribute("href", "/kontak");
    expect(screen.getByText("Lihat Portofolio")).toHaveAttribute("href", "/portfolio");

    // Stat tile + strip logo + CTA akhir.
    expect(screen.getByText("Kekuatan Produksi")).toBeInTheDocument();
    expect(screen.getByText(/Dipercaya oleh lebih dari 250\+ bisnis/)).toBeInTheDocument();
    expect(screen.getByText("Mulai Konsultasi")).toHaveAttribute("href", "/kontak");
  });

  it("API gagal → konten fallback statis (FE-S05)", async () => {
    const { failNextRequest } = await import("@/mocks/server");
    failNextRequest({ status: 500, code: "INTERNAL_ERROR", message: "Simulasi gagal." });
    renderWithRoutes([{ path: "/", loader: homeLoader, Component: HomePage }]);
    // Loader memakai fallback: hero statis tetap tampil.
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument());
    expect(screen.getByText(/Garment & sublim specialist sejak 2010/)).toBeInTheDocument();
  });

  it("slide kosong → fallback slide statis", async () => {
    const { server } = await import("@/mocks/server");
    const { http, HttpResponse } = await import("msw");
    const { fallbackHome } = await import("@/modules/site");
    server.use(
      http.get("*/api/v1/public/home", () =>
        HttpResponse.json({
          success: true,
          message: "Data berhasil diambil.",
          data: { ...fallbackHome, hero: { ...fallbackHome.hero, slides: [] } },
        }),
      ),
    );
    renderWithRoutes([{ path: "/", loader: homeLoader, Component: HomePage }]);
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument());
    const hero = screen.getByRole("heading", { level: 1 }).closest("section");
    expect(hero?.querySelector(".animate-hero-slide-one")).not.toBeNull();
  });

  it("data renggang → fallback judul/CTA", async () => {
    const { server } = await import("@/mocks/server");
    const { http, HttpResponse } = await import("msw");
    const { fallbackHome } = await import("@/modules/site");
    server.use(
      http.get("*/api/v1/public/home", () =>
        HttpResponse.json({
          success: true,
          message: "Data berhasil diambil.",
          data: {
            ...fallbackHome,
            hero: { title: null, subtitle: null, primary_cta: null, slides: [] },
          },
        }),
      ),
    );
    renderWithRoutes([{ path: "/", loader: homeLoader, Component: HomePage }]);
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument());
    // Judul + CTA fallback tampil.
    expect(screen.getByText("Produksi Garment dan Sublim Skala Bisnis")).toBeInTheDocument();
  });

  it("carousel logo: tombol geser memanggil scrollBy", async () => {
    const user = userEvent.setup();
    const scrollBy = vi.fn();
    Element.prototype.scrollBy = scrollBy as unknown as typeof Element.prototype.scrollBy;
    renderWithRoutes([{ path: "/", loader: homeLoader, Component: HomePage }]);
    await waitFor(() => expect(screen.getByLabelText("Geser logo ke kanan")).toBeInTheDocument());
    await user.click(screen.getByLabelText("Geser logo ke kanan"));
    expect(scrollBy).toHaveBeenCalled();
  });
});
