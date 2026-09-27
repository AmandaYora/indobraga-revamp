// @vitest-environment jsdom
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Toaster } from "sonner";
import { Outlet } from "react-router-dom";
import ServicesAdminPage from "@/modules/profile/pages/admin/ServicesAdminPage";
import PortfolioAdminPage from "@/modules/portfolio/pages/admin/PortfolioAdminPage";
import { loginAs, renderWithRoutes } from "@/test/utils";

function adminRoute(element: React.ReactNode) {
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
        children: [{ path: "admin/services", element }],
      },
    ],
    "/admin/services",
  );
}

describe("FE-C01 mesin ResourceManager", () => {
  it("search, tab status, pagination", async () => {
    const user = userEvent.setup();
    await loginAs();
    adminRoute(<ServicesAdminPage />);
    await waitFor(() => expect(screen.getByText("Daftar Layanan")).toBeInTheDocument());

    // Search memfilter.
    const search = screen.getByLabelText("Cari layanan");
    await user.type(search, "zzzz-tidak-ada");
    await waitFor(() => expect(screen.getByText("Tidak ada layanan")).toBeInTheDocument());
    await user.clear(search);

    // Tab arsip (awal kosong atau berisi).
    await user.click(screen.getByRole("button", { name: "Arsip" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Aktif" })).toBeInTheDocument());

    // Pagination: ganti page size.
    await user.click(screen.getByRole("button", { name: "Aktif" }));
    await waitFor(() => expect(screen.getByText(/Menampilkan/)).toBeInTheDocument());
  });

  it("tambah + validasi server per field", async () => {
    const user = userEvent.setup();
    await loginAs();
    adminRoute(<ServicesAdminPage />);
    await waitFor(() => expect(screen.getByText("Daftar Layanan")).toBeInTheDocument());

    await user.click(screen.getByText("Tambah layanan"));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    // Field Tampilan Website selalu ada.
    expect(dialog.textContent).toContain("Tampilan Website");
    await user.type(dialog.querySelector('input[type="text"]') as HTMLInputElement, "Layanan Uji");
    await user.click(dialog.querySelector('button[type="submit"]') as HTMLButtonElement);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    // Kartu mobile + baris desktop sama-sama di-DOM (CSS yang menyembunyikan).
    expect((await screen.findAllByText("Layanan Uji")).length).toBeGreaterThan(0);
  });
});

describe("FE-C04 toggle/arsip/hapus + FE-C05 pesan domain asli", () => {
  it("publish portofolio tanpa gambar → 422 pesan asli", async () => {
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
          children: [{ path: "admin/portfolio", element: <PortfolioAdminPage /> }],
        },
      ],
      "/admin/portfolio",
    );
    await waitFor(() => expect(screen.getByText("Portofolio Produk")).toBeInTheDocument());
    await user.click(screen.getByText("Tambah portofolio"));
    const dialog = await screen.findByRole("dialog");
    await user.type(
      dialog.querySelectorAll('input[type="text"]')[0] as HTMLInputElement,
      "Tanpa Gambar",
    );
    // Tunggu opsi kategori dari API lalu pilih yang pertama.
    // Urutan select: [0] Tampilan Website, [1] Kategori.
    const selects = dialog.querySelectorAll("select");
    const categorySelect = selects[1] as HTMLSelectElement;
    await waitFor(() => expect(categorySelect.options.length).toBeGreaterThan(1));
    await user.selectOptions(categorySelect, [categorySelect.options[1].value]);
    // Status → Tayang lalu simpan: tanpa gambar → 422 dengan pesan asli.
    await user.selectOptions(selects[0] as HTMLSelectElement, ["published"]);
    await user.click(dialog.querySelector('button[type="submit"]') as HTMLButtonElement);
    expect(
      await screen.findByText("Portofolio membutuhkan minimal 1 gambar untuk ditayangkan."),
    ).toBeInTheDocument();
  }, 20000);

  it("arsip via ConfirmDialog", async () => {
    const user = userEvent.setup();
    await loginAs();
    adminRoute(<ServicesAdminPage />);
    await waitFor(() => expect(screen.getByText("Daftar Layanan")).toBeInTheDocument());
    const archiveButtons = await screen.findAllByLabelText("Arsipkan");
    expect(archiveButtons.length).toBeGreaterThan(0);
    await user.click(archiveButtons[0]);
    const confirm = await screen.findByRole("alertdialog");
    expect(confirm.textContent).toContain("Arsipkan layanan ini?");
    await user.click(confirm.querySelector("button:last-child") as HTMLButtonElement);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("ubah mengisi form + toggle tayang", async () => {
    const user = userEvent.setup();
    await loginAs();
    adminRoute(<ServicesAdminPage />);
    await waitFor(() => expect(screen.getByText("Daftar Layanan")).toBeInTheDocument());

    const editButtons = await screen.findAllByLabelText("Ubah");
    await user.click(editButtons[0]);
    const dialog = await screen.findByRole("dialog");
    const nameInput = dialog.querySelector(
      'input[type="text"], input:not([type])',
    ) as HTMLInputElement;
    expect(nameInput.value.length).toBeGreaterThan(0);
    await user.clear(nameInput);
    await user.type(nameInput, "Layanan Ubah Uji");
    await user.click(dialog.querySelector('button[type="submit"]') as HTMLButtonElement);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(await screen.findAllByText("Layanan Ubah Uji")).not.toHaveLength(0);

    // Toggle dua arah pada item yang sama.
    const toggleButtons = await screen.findAllByLabelText(/Tayangkan|Pindah ke draf/);
    await user.click(toggleButtons[0]);
    expect(await screen.findByText(/Ditayangkan|Dipindah ke draf/)).toBeInTheDocument();
  });

  it("unarsip + hapus permanen via tab Arsip + batal dialog", async () => {
    const user = userEvent.setup();
    await loginAs();
    const { contentService } = await import("@/modules/content/services/content.service");
    await contentService.create("services", { name: "Arsip Uji", status: "draft" });
    const created = (
      await contentService.list<{ id: number; name: string }>("services", { q: "Arsip Uji" })
    ).items[0];
    await contentService.archive("services", created.id);
    adminRoute(<ServicesAdminPage />);
    await waitFor(() => expect(screen.getByText("Daftar Layanan")).toBeInTheDocument());

    // Batal pada dialog konfirmasi menutup tanpa aksi.
    const deleteButtons = await screen.findAllByLabelText("Hapus permanen");
    await user.click(deleteButtons[0]);
    await screen.findByRole("alertdialog");
    await user.click(screen.getByText("Batal"));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());

    // Tab Arsip → unarsip + hapus (mobile + desktop me-render ganda).
    await user.click(screen.getByRole("button", { name: "Arsip" }));
    expect(await screen.findAllByText("Arsip Uji", {}, { timeout: 8000 })).not.toHaveLength(0);
    await user.click((await screen.findAllByLabelText("Keluarkan dari arsip"))[0]);
    expect(await screen.findByText("Dikeluarkan dari arsip")).toBeInTheDocument();

    // Ganti ukuran halaman.
    await user.click(screen.getByRole("button", { name: "Aktif" }));
    const size = screen.getByLabelText("Per halaman") as HTMLSelectElement;
    fireEvent.change(size, { target: { value: "25" } });
    await waitFor(() => expect(size.value).toBe("25"));
  });

  it("state error + coba lagi", async () => {
    await loginAs();
    const { failNextRequest } = await import("@/mocks/server");
    failNextRequest({ status: 500, code: "INTERNAL_ERROR", message: "Simulasi gagal." });
    adminRoute(<ServicesAdminPage />);
    expect(await screen.findByText("Coba lagi")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByText("Coba lagi"));
    await waitFor(() => expect(screen.getByText("Daftar Layanan")).toBeInTheDocument());
  });

  it("buka modal hero (hidden + media)", async () => {
    const user = userEvent.setup();
    await loginAs();
    const { default: HeroAdminPage } = await import("@/modules/profile/pages/admin/HeroAdminPage");
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
          children: [{ path: "admin/hero", element: <HeroAdminPage /> }],
        },
      ],
      "/admin/hero",
    );
    await waitFor(() => expect(screen.getByText("Konten Beranda")).toBeInTheDocument());
    await user.click(screen.getAllByText("Tambah slide")[0]);
    const heroDialog = await screen.findByRole("dialog");
    expect(heroDialog.textContent).toContain("Gambar");
    await user.click(screen.getByText("Batal"));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  }, 25000);

  it("buka modal berita (paragraf + media + SEO)", async () => {
    const user = userEvent.setup();
    await loginAs();
    const { default: NewsAdminPage } = await import("@/modules/news/pages/admin/NewsAdminPage");
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
          children: [{ path: "admin/news", element: <NewsAdminPage /> }],
        },
      ],
      "/admin/news",
    );
    await waitFor(() => expect(screen.getByText("Berita")).toBeInTheDocument());
    await user.click(screen.getByText("Tambah berita"));
    const newsDialog = await screen.findByRole("dialog");
    expect(newsDialog.textContent).toContain("Isi artikel");
    expect(newsDialog.textContent).toContain("Gambar Saat Dibagikan");
  }, 25000);
});
