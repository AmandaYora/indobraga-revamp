// @vitest-environment jsdom
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Outlet } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Toaster } from "sonner";
import LoginPage from "@/modules/auth/pages/LoginPage";
import { redirectIfAuthenticated, requireAuth } from "@/app/routes/guards";
import { authState, loginAs, renderWithRoutes } from "@/test/utils";
import { MOCK_PASSWORD } from "@/mocks/db";

function loginShell() {
  return {
    path: "/",
    element: (
      <>
        <Outlet />
        <Toaster />
      </>
    ),
    children: [
      { path: "login", loader: redirectIfAuthenticated, Component: LoginPage },
      { path: "admin", element: <div>Halaman admin</div> },
      { path: "admin/news", element: <div>Berita admin</div> },
    ],
  };
}

function loginRoute() {
  return [loginShell()];
}

describe("FE-L01 login", () => {
  it("email prefilled + login sukses → redirect /admin", async () => {
    const user = userEvent.setup();
    const { router } = renderWithRoutes(loginRoute(), "/login");
    const email = await screen.findByLabelText("Email");
    expect(email).toHaveValue("admin@indobraga.com");
    await user.type(screen.getByLabelText("Kata sandi"), MOCK_PASSWORD);
    await user.click(screen.getByText("Masuk ke Panel Admin"));
    await waitFor(() => expect(router.state.location.pathname).toBe("/admin"));
    expect(authState().status).toBe("authenticated");
    expect(await screen.findByText("Login berhasil")).toBeInTheDocument();
  });

  it("kredensial salah → toast error", async () => {
    const user = userEvent.setup();
    renderWithRoutes(loginRoute(), "/login");
    const password = await screen.findByLabelText("Kata sandi");
    await user.type(password, "salah-salah-123");
    await user.click(screen.getByText("Masuk ke Panel Admin"));
    expect(await screen.findByText("Email atau kata sandi belum sesuai.")).toBeInTheDocument();
  });

  it("429 rate limit → pesan tunggu", async () => {
    const user = userEvent.setup();
    renderWithRoutes(loginRoute(), "/login");
    const password = await screen.findByLabelText("Kata sandi");
    // Habiskan kuota login mock (5/60 dtk) dengan kredensial salah.
    for (let i = 0; i < 5; i++) {
      await user.clear(password);
      await user.type(password, "salah-salah-123");
      await user.click(screen.getByRole("button", { name: "Masuk ke Panel Admin" }));
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Masuk ke Panel Admin" })).not.toBeDisabled(),
      );
    }
    await user.clear(password);
    await user.type(password, MOCK_PASSWORD);
    await user.click(screen.getByRole("button", { name: "Masuk ke Panel Admin" }));
    // Kuota habis di level mock → pesan rate limit login.
    expect(await screen.findByText(/Terlalu banyak percobaan masuk/)).toBeInTheDocument();
  });
});

describe("FE-L02 guard + BC-25", () => {
  it("requireAuth: anonim → /login?redirect=", async () => {
    const { router } = renderWithRoutes(
      [
        { path: "/admin", loader: requireAuth, element: <div>Admin</div> },
        { path: "/login", element: <div>Login</div> },
      ],
      "/admin",
    );
    await waitFor(() => expect(router.state.location.pathname).toBe("/login"));
    expect(router.state.location.search).toContain("redirect=%2Fadmin");
  });

  it("sudah login → lolos guard; /login redirect ke tujuan (BC-25)", async () => {
    await loginAs();
    const { router } = renderWithRoutes(
      [
        { path: "/admin", loader: requireAuth, element: <div>Admin</div> },
        { path: "/admin/news", loader: requireAuth, element: <div>Berita admin</div> },
        { path: "/login", loader: redirectIfAuthenticated, element: <div>Login</div> },
      ],
      "/login?redirect=/admin/news",
    );
    await waitFor(() => expect(router.state.location.pathname).toBe("/admin/news"));
  });

  it("submit kosong → pesan validasi", async () => {
    const user = userEvent.setup();
    renderWithRoutes(loginRoute(), "/login");
    const emailInput = await screen.findByLabelText("Email");
    await user.clear(emailInput);
    await user.click(screen.getByText("Masuk ke Panel Admin"));
    expect(await screen.findByText("Login gagal")).toBeInTheDocument();
  });

  it("redirect jahat diabaikan → /admin", async () => {
    const user = userEvent.setup();
    const { router } = renderWithRoutes(loginRoute(), "/login?redirect=https://evil.test/x");
    const password = await screen.findByLabelText("Kata sandi");
    await user.type(password, MOCK_PASSWORD);
    await user.click(screen.getByText("Masuk ke Panel Admin"));
    await waitFor(() => expect(router.state.location.pathname).toBe("/admin"));
  });

  it("kembali ke tujuan setelah login (FE-L02)", async () => {
    const user = userEvent.setup();
    const { router } = renderWithRoutes(loginRoute(), "/login?redirect=/admin/news");
    const password = await screen.findByLabelText("Kata sandi");
    await user.type(password, MOCK_PASSWORD);
    await user.click(screen.getByText("Masuk ke Panel Admin"));
    // Kembali ke halaman tujuan setelah login (BC-25).
    await waitFor(() => expect(router.state.location.pathname).toBe("/admin/news"));
  });
});
