// @vitest-environment jsdom
import { screen, waitFor, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Suspense } from "react";
import { router } from "@/app/routes";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { ADMIN_MENU, ALL_ADMIN_LINKS } from "@/app/routes/admin-menu";
import { loginAs } from "@/test/utils";

/** Smoke test router aplikasi: publik, guard admin, login, Not Found. */
describe("router aplikasi", () => {
  it("definisi route lengkap", () => {
    expect(router).toBeDefined();
    // 18 link admin terdaftar di menu.
    expect(ALL_ADMIN_LINKS).toHaveLength(18);
    expect(ADMIN_MENU).toHaveLength(5);
    const paths = ALL_ADMIN_LINKS.map((link) => link.to);
    for (const path of ["/admin", "/admin/hero", "/admin/email-blast", "/admin/users"]) {
      expect(paths).toContain(path);
    }
  });

  it("rute publik lazy me-render beranda", async () => {
    const memory = createMemoryRouter(router.routes, { initialEntries: ["/"] });
    render(
      <Suspense fallback={<div>Memuat…</div>}>
        <RouterProvider router={memory} />
      </Suspense>,
    );
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument(), {
      timeout: 8000,
    });
  });

  it("rute publik lain me-render + login noindex", async () => {
    const memory = createMemoryRouter(router.routes, { initialEntries: ["/portfolio"] });
    render(
      <Suspense fallback={<div>Memuat…</div>}>
        <RouterProvider router={memory} />
      </Suspense>,
    );
    const paths = ["/portfolio", "/fasilitas", "/galeri", "/berita", "/kontak", "/login"];
    for (const path of paths) {
      await memory.navigate(path);
      await waitFor(() => expect(memory.state.location.pathname).toBe(path), { timeout: 10000 });
      await waitFor(() => expect(memory.state.errors).toBeNull(), { timeout: 10000 });
    }
  }, 60000);

  it("guard: /admin anonim → /login (BC-25/BC-26)", async () => {
    const memory = createMemoryRouter(router.routes, { initialEntries: ["/admin"] });
    render(
      <Suspense fallback={<div>Memuat…</div>}>
        <RouterProvider router={memory} />
      </Suspense>,
    );
    await waitFor(() => expect(memory.state.location.pathname).toBe("/login"), { timeout: 8000 });
    expect(memory.state.location.search).toContain("redirect=");
  });

  it("path asing → Not Found (BC-22)", async () => {
    const memory = createMemoryRouter(router.routes, { initialEntries: ["/jalan-tidak-ada"] });
    render(
      <Suspense fallback={<div>Memuat…</div>}>
        <RouterProvider router={memory} />
      </Suspense>,
    );
    await waitFor(() => expect(screen.getByText("404")).toBeInTheDocument(), { timeout: 8000 });
  });

  it("sudah login → /admin lolos guard", async () => {
    await loginAs();
    const memory = createMemoryRouter(router.routes, { initialEntries: ["/admin"] });
    render(
      <Suspense fallback={<div>Memuat…</div>}>
        <RouterProvider router={memory} />
      </Suspense>,
    );
    await waitFor(() => expect(screen.getByText("Selamat datang kembali")).toBeInTheDocument(), {
      timeout: 8000,
    });
  });

  it("semua halaman admin lazy-load tanpa error", async () => {
    await loginAs();
    const memory = createMemoryRouter(router.routes, { initialEntries: ["/admin"] });
    render(
      <Suspense fallback={<div>Memuat…</div>}>
        <RouterProvider router={memory} />
      </Suspense>,
    );
    const paths = [
      "/admin/hero",
      "/admin/partners",
      "/admin/strength",
      "/admin/portfolio",
      "/admin/portfolio-categories",
      "/admin/machines",
      "/admin/services",
      "/admin/gallery",
      "/admin/news",
      "/admin/inquiries",
      "/admin/whatsapp",
      "/admin/email-accounts",
      "/admin/email-blast",
      "/admin/email-templates",
      "/admin/email-history",
      "/admin/settings",
      "/admin/users",
    ];
    for (const path of paths) {
      await memory.navigate(path);
      await waitFor(
        () => {
          expect(memory.state.location.pathname).toBe(path);
          expect(memory.state.errors).toBeNull();
        },
        { timeout: 10000 },
      );
    }
  }, 60000);
});
