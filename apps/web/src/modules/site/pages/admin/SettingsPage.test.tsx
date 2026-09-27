// @vitest-environment jsdom
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Outlet } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Toaster } from "sonner";
import SettingsPage from "@/modules/site/pages/admin/SettingsPage";
import { loginAs, renderWithRoutes } from "@/test/utils";

describe("FE-ST01 pengaturan", () => {
  it("identitas, radio logo, SEO, simpan", async () => {
    const user = userEvent.setup();
    await loginAs();
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
          children: [{ path: "admin/settings", element: <SettingsPage /> }],
        },
      ],
      "/admin/settings",
    );
    await waitFor(() => expect(screen.getByText("Pengaturan Website")).toBeInTheDocument());

    // Radio tampilan logo.
    expect(screen.getByText("Logo + Nama")).toBeInTheDocument();
    expect(screen.getByText("Logo Saja")).toBeInTheDocument();
    // SEO default situs (BC-21).
    expect(screen.getByText("Judul SEO situs")).toBeInTheDocument();
    // 4 upload media.
    for (const label of ["Logo navbar", "Logo footer", "Gambar hero kontak", "Gambar OG default"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }

    // Ubah brand lalu simpan.
    const brand = screen.getByLabelText("Nama brand") as HTMLInputElement;
    await user.clear(brand);
    await user.type(brand, "Indobraga Uji");
    // Radio tampilan logo → Logo Saja.
    await user.click(screen.getByText("Logo Saja"));
    // Upload logo navbar (spy service).
    const { mediaService } = await import("@/modules/media/services/media.service");
    const { vi: vitest } = await import("vitest");
    const spy = vitest.spyOn(mediaService, "uploadWithProgress").mockResolvedValue({
      id: 777,
      media_type: "image",
      original_file_name: "logo.png",
      compression_status: "completed",
      thumbnail_url: "http://localhost/mock-media/777/thumbnail",
      medium_url: "http://localhost/mock-media/777/medium",
      file_url: "http://localhost/mock-media/777/original",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    } as never);
    try {
      const { fireEvent } = await import("@testing-library/react");
      const logoInput = screen.getByLabelText("Logo navbar") as HTMLInputElement;
      fireEvent.change(logoInput, {
        target: { files: [new File(["logo"], "logo.png", { type: "image/png" })] },
      });
      await waitFor(() => expect(spy).toHaveBeenCalled());
    } finally {
      spy.mockRestore();
    }
    await user.click(screen.getAllByText("Simpan")[0]);
    expect(await screen.findByText("Pengaturan disimpan")).toBeInTheDocument();
  });

  it("brand kosong → validasi", async () => {
    const user = userEvent.setup();
    await loginAs();
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
          children: [{ path: "admin/settings", element: <SettingsPage /> }],
        },
      ],
      "/admin/settings",
    );
    await waitFor(() => expect(screen.getByText("Pengaturan Website")).toBeInTheDocument());
    await user.clear(screen.getByLabelText("Nama brand"));
    await user.click(screen.getAllByText("Simpan")[0]);
    expect(await screen.findByText("Nama brand wajib diisi.")).toBeInTheDocument();
  });

  it("API gagal → error + coba lagi", async () => {
    const user = userEvent.setup();
    await loginAs();
    const { failNextRequest } = await import("@/mocks/server");
    failNextRequest({ status: 500, code: "INTERNAL_ERROR", message: "Simulasi gagal." });
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
          children: [{ path: "admin/settings", element: <SettingsPage /> }],
        },
      ],
      "/admin/settings",
    );
    expect(await screen.findByText("Coba lagi")).toBeInTheDocument();
    await user.click(screen.getByText("Coba lagi"));
    await waitFor(() => expect(screen.getByText("Pengaturan Website")).toBeInTheDocument());
  });
});
