// @vitest-environment jsdom
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import FacilitiesPage from "@/modules/profile/pages/FacilitiesPage";
import GalleryPage from "@/modules/gallery/pages/GalleryPage";
import { facilitiesLoader, galleryLoader } from "@/modules/site";
import { renderWithRoutes } from "@/test/utils";

describe("FE-F01 fasilitas", () => {
  it("total kapasitas bulanan terhitung + mesin + layanan", async () => {
    renderWithRoutes(
      [{ path: "/fasilitas", loader: facilitiesLoader, Component: FacilitiesPage }],
      "/fasilitas",
    );
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument());
    // 6.000+45.000+10.000+9.000+20.000 = 90.000 (format id-ID).
    expect(screen.getByText(/Total 90\.000 pcs per bulan/)).toBeInTheDocument();
    expect(screen.getByText("Data CP Indobraga")).toBeInTheDocument();
    expect(screen.getByText("Atexco Model X Plus")).toBeInTheDocument();
    expect(screen.getByText("Apparel Manufacturing Services")).toBeInTheDocument();
  });

  it("data renggang: tanpa suffix/deskripsi + nilai non-angka", async () => {
    const { server } = await import("@/mocks/server");
    const { http, HttpResponse } = await import("msw");
    const { fallbackFacilities } = await import("@/modules/site");
    server.use(
      http.get("*/api/v1/public/facilities", () =>
        HttpResponse.json({
          success: true,
          message: "Data berhasil diambil.",
          data: {
            strengths: [
              {
                id: 1,
                label: "S",
                value: "V",
                sort_order: 0,
                status: "published",
                previous_status: null,
                archived_at: null,
                created_at: "2026-01-01T00:00:00.000Z",
                updated_at: "2026-01-01T00:00:00.000Z",
              },
            ],
            machines: [
              {
                id: 1,
                name: "M",
                slug: "m",
                sort_order: 0,
                status: "published",
                previous_status: null,
                archived_at: null,
                created_at: "2026-01-01T00:00:00.000Z",
                updated_at: "2026-01-01T00:00:00.000Z",
              },
            ],
            printing_capacities: [],
            production_capacities: [
              {
                id: 1,
                product: "X",
                value: "bukan-angka",
                unit: "pcs",
                sort_order: 0,
                status: "published",
                previous_status: null,
                archived_at: null,
                created_at: "2026-01-01T00:00:00.000Z",
                updated_at: "2026-01-01T00:00:00.000Z",
              },
            ],
            services: [],
          },
        }),
      ),
    );
    expect(fallbackFacilities.strengths.length).toBeGreaterThan(0);
    renderWithRoutes(
      [{ path: "/fasilitas", loader: facilitiesLoader, Component: FacilitiesPage }],
      "/fasilitas",
    );
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument());
    expect(screen.getByText(/Total 0 pcs per bulan/)).toBeInTheDocument();
  });
});

describe("FE-G01/G02 galeri", () => {
  it("tile ke-7 besar + lightbox navigasi", async () => {
    const user = userEvent.setup();
    renderWithRoutes(
      [{ path: "/galeri", loader: galleryLoader, Component: GalleryPage }],
      "/galeri",
    );
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument());

    const buttons = await screen.findAllByRole("button", { name: /Buka / });
    expect(buttons.length).toBeGreaterThan(0);
    // Mosaik: tile pertama (index 0, 0 % 7) memakai col-span-2.
    expect(buttons[0].className).toContain("sm:col-span-2");

    await user.click(buttons[0]);
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    await user.click(screen.getByLabelText("Berikutnya"));
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("item video menampilkan overlay play + pratinjau video", async () => {
    const user = userEvent.setup();
    const { server } = await import("@/mocks/server");
    const { http, HttpResponse } = await import("msw");
    server.use(
      http.get("*/api/v1/public/gallery", () =>
        HttpResponse.json({
          success: true,
          message: "Data berhasil diambil.",
          data: [
            {
              id: 1,
              type: "image",
              thumbnail_url: null,
              media_url: null,
              caption: "Foto",
              alt_text: "Foto",
              published_at: null,
            },
            {
              id: 2,
              type: "video",
              thumbnail_url: null,
              media_url: null,
              caption: "Video",
              alt_text: "Video",
              published_at: null,
            },
          ],
          meta: { limit: 24, next_cursor: null, has_more: false },
        }),
      ),
    );
    renderWithRoutes(
      [{ path: "/galeri", loader: galleryLoader, Component: GalleryPage }],
      "/galeri",
    );
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument());
    const buttons = await screen.findAllByRole("button", { name: /Buka / });
    await user.click(buttons[1]);
    const dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).toContain("Pratinjau video belum tersedia");
    await user.click(screen.getByLabelText("Tutup pratinjau"));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("cursor berikutnya diambil saat habis (2 halaman mock)", async () => {
    const user = userEvent.setup();
    const { server } = await import("@/mocks/server");
    const { http, HttpResponse } = await import("msw");
    const item = (id: number) => ({
      id,
      type: "image",
      thumbnail_url: null,
      media_url: null,
      caption: `Foto ${id}`,
      alt_text: `Foto ${id}`,
      published_at: null,
    });
    server.use(
      http.get("*/api/v1/public/gallery", ({ request }) => {
        const url = new URL(request.url);
        const cursor = url.searchParams.get("cursor");
        const items = cursor ? [9, 10].map(item) : [1, 2, 3, 4, 5, 6, 7, 8].map(item);
        return HttpResponse.json({
          success: true,
          message: "Data berhasil diambil.",
          data: items,
          meta: cursor
            ? { limit: 24, next_cursor: null, has_more: false }
            : { limit: 24, next_cursor: "cursor-2", has_more: true },
        });
      }),
    );
    renderWithRoutes(
      [{ path: "/galeri", loader: galleryLoader, Component: GalleryPage }],
      "/galeri",
    );
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument());
    const more = await screen.findByText("Muat lagi");
    await user.click(more);
    await waitFor(() => expect(screen.getByLabelText("Buka Foto 9")).toBeInTheDocument());
    await waitFor(() => expect(screen.queryByText("Muat lagi")).toBeNull());
  });
});
