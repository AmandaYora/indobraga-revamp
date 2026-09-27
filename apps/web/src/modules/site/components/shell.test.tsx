// @vitest-environment jsdom
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { SiteHeader } from "@/modules/site/components/SiteHeader";
import { SiteFooter } from "@/modules/site/components/SiteFooter";
import { Seo } from "@/modules/site/components/Seo";
import NotFoundPage from "@/modules/site/pages/NotFoundPage";
import { renderWithRoutes } from "@/test/utils";
import { useSiteSettingsStore } from "@/modules/site/stores/site-settings.store";

describe("FE-S01 header", () => {
  it("logo, nav aktif, menu mobile", async () => {
    const user = userEvent.setup();
    renderWithRoutes([
      {
        path: "/",
        element: (
          <>
            <SiteHeader />
            <div>Beranda</div>
          </>
        ),
      },
      {
        path: "/portfolio",
        element: (
          <>
            <SiteHeader />
            <div>Portofolio</div>
          </>
        ),
      },
    ]);
    expect(screen.getByLabelText("Beranda Indobraga")).toHaveTextContent("Indobraga");
    const nav = screen.getByLabelText("Navigasi utama");
    expect(within(nav).getByText("Portofolio")).toBeInTheDocument();
    // Nav aktif beranda (exact).
    expect(within(nav).getByText("Beranda")).toHaveClass("text-primary");

    await user.click(screen.getByLabelText("Buka menu"));
    const mobile = screen.getByLabelText("Navigasi seluler");
    await user.click(within(mobile).getByText("Galeri"));
    await waitFor(() => expect(screen.queryByLabelText("Navigasi seluler")).toBeNull());
  });

  it("logo asli + tanpa teks brand", () => {
    useSiteSettingsStore.setState({
      settings: {
        ...useSiteSettingsStore.getState().settings,
        logo_url: "https://x.test/logo.png",
        show_brand_text: false,
      },
    });
    renderWithRoutes([{ path: "/", element: <SiteHeader /> }]);
    expect(screen.getByAltText("Indobraga")).toHaveAttribute("src", "https://x.test/logo.png");
    expect(screen.queryByText("Indobraga")).toBeNull();
  });
});

describe("FE-S02 footer", () => {
  it("logo footer, kontak, instagram, alamat", () => {
    useSiteSettingsStore.setState({
      settings: {
        brand: "Indobraga",
        legal_name: "PT. Braga Indonesia Perkasa",
        email: "indobraga@gmail.com",
        phone: "0851-5870-0895",
        whatsapp: "6285158700895",
        instagram: "indobraga",
        contact_person: "Mahardika",
        contact_role: "Tim Marketing",
        address: "Jalan Babakan Tarogong No. 292, Kota Bandung",
        show_brand_text: false,
        logo_url: null,
        footer_logo_url: null,
        contact_hero_image_url: null,
      },
      loaded: true,
    });
    renderWithRoutes([{ path: "/", element: <SiteFooter /> }]);
    expect(screen.getByText(/mitra apparel manufacturing/)).toBeInTheDocument();
    expect(screen.getByText("indobraga@gmail.com")).toBeInTheDocument();
    expect(screen.getByText("@indobraga")).toBeInTheDocument();
    expect(screen.getByText("Jalan Babakan Tarogong No. 292, Kota Bandung")).toBeInTheDocument();
    expect(screen.getByText(/Hak cipta dilindungi/)).toBeInTheDocument();
  });
});

describe("Seo (BC-20)", () => {
  it("tepat 1 title, 1 canonical, 1 set og + hapus tag server", () => {
    document.head.innerHTML = `
      <title data-server-seo>Lama</title>
      <meta data-server-seo property="og:title" content="Lama" />
      <link data-server-seo rel="canonical" href="https://indobraga.com/lama" />
    `;
    renderWithRoutes([
      { path: "/", element: <Seo title="Beranda" description="Desc" path="/" image={null} /> },
    ]);
    expect(document.querySelectorAll("[data-server-seo]")).toHaveLength(0);
    expect(document.querySelectorAll("title")).toHaveLength(1);
    expect(document.title).toBe("Beranda - Indobraga");
    expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(document.querySelectorAll('meta[property="og:title"]')).toHaveLength(1);
  });

  it("login/admin: noindex tanpa canonical", () => {
    renderWithRoutes(
      [{ path: "/login", element: <Seo title="Masuk" path="/login" noindex /> }],
      "/login",
    );
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, nofollow",
    );
    expect(document.querySelector('link[rel="canonical"]')).toBeNull();
  });

  it("default SEO dari Pengaturan admin (BC-21) + artikel tanpa meta waktu", () => {
    const { unmount } = renderWithRoutes([{ path: "/", element: <Seo path="/" /> }]);
    // Tanpa judul + settings default null → fallback bawaan.
    expect(document.title).toContain("Indobraga");
    unmount();
    renderWithRoutes([{ path: "/a", element: <Seo title="T" path="/a" type="article" /> }], "/a");
    expect(document.querySelector('meta[property="article:published_time"]')).toBeNull();
    expect(document.querySelector('meta[property="og:type"]')).toHaveAttribute(
      "content",
      "article",
    );
  });

  it("judul + deskripsi + OG dari settings (BC-21)", () => {
    useSiteSettingsStore.setState({
      settings: {
        ...useSiteSettingsStore.getState().settings,
        seo: {
          title: "Judul Admin",
          description: "Deskripsi Admin",
          og_image_url: "https://x.test/og.png",
        },
      },
    });
    renderWithRoutes([{ path: "/", element: <Seo path="/" /> }]);
    expect(document.title).toBe("Judul Admin - Indobraga");
    expect(document.querySelector('meta[property="og:image"]')).toHaveAttribute(
      "content",
      "https://x.test/og.png",
    );
  });
});

describe("FE-S06 Not Found", () => {
  it("halaman 404 bergaya sama dengan tautan beranda", () => {
    renderWithRoutes([{ path: "*", element: <NotFoundPage /> }], "/jalan-asing");
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByText("Halaman tidak ditemukan")).toBeInTheDocument();
    expect(screen.getByText("Kembali ke Beranda")).toHaveAttribute("href", "/");
  });
});
