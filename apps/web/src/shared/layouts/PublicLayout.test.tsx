// @vitest-environment jsdom
import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ContactPage from "@/modules/site/pages/ContactPage";
import { PublicLayout } from "@/shared/layouts/PublicLayout";
import { readBootstrap } from "@/shared/services/bootstrap";
import { renderWithRoutes } from "@/test/utils";
import { useSiteSettingsStore } from "@/modules/site/stores/site-settings.store";

describe("ContactPage", () => {
  it("info kontak dari settings + form inquiry", async () => {
    renderWithRoutes([{ path: "/kontak", element: <ContactPage /> }], "/kontak");
    await waitFor(() => expect(screen.getByText("Informasi Kontak")).toBeInTheDocument());
    expect(screen.getAllByText("Kirim Pesan").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Nama")).toBeInTheDocument();
  });

  it("tetap tampil bila settings kosong", async () => {
    useSiteSettingsStore.setState({
      settings: {
        brand: null,
        legal_name: null,
        email: null,
        phone: null,
        whatsapp: null,
        instagram: null,
        contact_person: null,
        contact_role: null,
        address: null,
        show_brand_text: false,
        logo_url: null,
        footer_logo_url: null,
        contact_hero_image_url: null,
      },
      loaded: true,
    });
    renderWithRoutes([{ path: "/kontak", element: <ContactPage /> }], "/kontak");
    await waitFor(() => expect(screen.getByText("Informasi Kontak")).toBeInTheDocument());
    expect(screen.getByLabelText("Nama")).toBeInTheDocument();
  });
});

describe("PublicLayout bootstrap (BC-23)", () => {
  it("hidrasi settings dari bootstrap lalu fetch sekali", async () => {
    document.body.innerHTML += `<script id="__INDOBRAGA_BOOTSTRAP__" type="application/json">${JSON.stringify(
      {
        path: "/",
        site_settings: { brand: "BootBrand", show_brand_text: true },
      },
    )}</script>`;
    renderWithRoutes(
      [
        {
          path: "/",
          element: <PublicLayout />,
          children: [{ index: true, element: <div>Isi</div> }],
        },
      ],
      "/",
    );
    await waitFor(() => expect(screen.getByText("Isi")).toBeInTheDocument());
    // Bootstrap dikonsumsi (node dihapus) dan store terhidrasi.
    expect(document.getElementById("__INDOBRAGA_BOOTSTRAP__")).toBeNull();
    expect(readBootstrap("/")).not.toBeNull();
    await waitFor(() => expect(useSiteSettingsStore.getState().loaded).toBe(true));
  });
});
