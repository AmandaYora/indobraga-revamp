// @vitest-environment jsdom
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Outlet } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Toaster } from "sonner";
import { AdminLayout } from "@/shared/layouts/AdminLayout";
import { ALL_ADMIN_LINKS } from "@/app/routes/admin-menu";
import { loginAs, renderWithRoutes, stubEventSource } from "@/test/utils";

function adminRoutes(initialPath = "/admin") {
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
        children: [
          {
            path: "admin",
            element: <AdminLayout />,
            children: [
              { index: true, element: <div>Konten ringkasan</div> },
              { path: "news", element: <div>Konten berita</div> },
            ],
          },
          { path: "login", element: <div>Halaman login</div> },
        ],
      },
    ],
    initialPath,
  );
}

describe("FE-A01 sidebar admin", () => {
  it("5 grup menu, item aktif kuning, drawer mobile", async () => {
    const user = userEvent.setup();
    stubEventSource();
    await loginAs();
    const { router } = adminRoutes("/admin/news");
    await waitFor(() => expect(screen.getByText("Konten berita")).toBeInTheDocument());

    // 18 link sesuai baseline legacy (PLAN-02 menyebut 16 — konflik dilaporkan).
    expect(ALL_ADMIN_LINKS).toHaveLength(18);
    for (const group of ["Ringkasan", "Konten Website", "Prospek", "Email", "Pengaturan"]) {
      expect(screen.getByRole("navigation", { name: group })).toBeInTheDocument();
    }
    // Item aktif memakai warna primer sidebar.
    const active = screen.getByRole("link", { name: "Berita" });
    expect(active.className).toContain("bg-sidebar-primary");

    // Drawer mobile: buka → navigasi → tutup.
    await user.click(screen.getByLabelText("Buka menu"));
    expect(screen.getByLabelText("Menu admin seluler")).toBeInTheDocument();
    await user.click(screen.getAllByRole("link", { name: "Ringkasan" })[0]);
    await waitFor(() => expect(router.state.location.pathname).toBe("/admin"));
  });
});

describe("FE-A02 pencarian menu (BC-27)", () => {
  it("memfilter link sidebar", async () => {
    const user = userEvent.setup();
    stubEventSource();
    await loginAs();
    adminRoutes();
    await waitFor(() => expect(screen.getByText("Konten ringkasan")).toBeInTheDocument());

    const search = screen.getByRole("searchbox", { name: "Cari menu admin" });
    await user.type(search, "berita");
    await waitFor(() => {
      expect(screen.queryByRole("link", { name: "Ringkasan" })).toBeNull();
      expect(screen.getAllByRole("link", { name: "Berita" }).length).toBeGreaterThan(0);
    });
    await user.clear(search);
    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Ringkasan" })).toBeInTheDocument(),
    );

    // Query tanpa hasil.
    await user.type(search, "zzzz-tidak-ada-menu");
    await waitFor(() => expect(screen.getByText("Tidak ada menu yang cocok.")).toBeInTheDocument());
  });
});

describe("FE-L03 logout", () => {
  it("menghapus sesi & kembali ke login", async () => {
    const user = userEvent.setup();
    stubEventSource();
    await loginAs();
    const { router } = adminRoutes();
    await waitFor(() => expect(screen.getByText("Konten ringkasan")).toBeInTheDocument());
    await user.click(screen.getAllByText("Keluar")[0]);
    await waitFor(() => expect(router.state.location.pathname).toBe("/login"));
    expect(await screen.findByText("Anda sudah keluar")).toBeInTheDocument();
  });
});

describe("FE-A01 profil admin", () => {
  it("inisial + peran tampil di top bar", async () => {
    stubEventSource();
    await loginAs();
    adminRoutes();
    await waitFor(() => expect(screen.getByText("Konten ringkasan")).toBeInTheDocument());
    expect(screen.getByLabelText(/Profil /)).toBeInTheDocument();
    expect(screen.getByText("Admin Utama")).toBeInTheDocument();
    expect(screen.getByLabelText(/Notifikasi/)).toBeInTheDocument();
  });
});
