// @vitest-environment jsdom
import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DashboardPage from "@/modules/dashboard/pages/DashboardPage";
import { loginAs, renderWithRoutes } from "@/test/utils";

describe("FE-D01 dashboard", () => {
  it("6 stat card + inquiry & kampanye terbaru", async () => {
    await loginAs();
    renderWithRoutes([{ path: "/admin", element: <DashboardPage /> }], "/admin");
    await waitFor(() => expect(screen.getByText("Selamat datang kembali")).toBeInTheDocument());
    for (const label of [
      "Total Pesan Kontak",
      "Prospek WhatsApp",
      "Berita Tayang",
      "Portofolio Aktif",
      "Media Siap Pakai",
      "Email Massal Menunggu",
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText("Pesan Kontak Terbaru")).toBeInTheDocument();
    expect(screen.getByText("Email Massal Terbaru")).toBeInTheDocument();
  });

  it("state kosong saat belum ada aktivitas", async () => {
    const { server } = await import("@/mocks/server");
    const { http, HttpResponse } = await import("msw");
    server.use(
      http.get("*/api/v1/admin/dashboard", () =>
        HttpResponse.json({
          success: true,
          message: "Data berhasil diambil.",
          data: {
            totals: {
              inquiries: 0,
              whatsapp_leads: 0,
              published_gallery: 0,
              published_news: 0,
              active_portfolios: 0,
              completed_media: 0,
              failed_media: 0,
              connected_email_accounts: 0,
              email_campaigns: 0,
              pending_email_campaigns: 0,
              pending_revalidation: 0,
            },
            latest_inquiries: [],
            latest_whatsapp_leads: [],
            latest_email_campaigns: [],
          },
        }),
      ),
    );
    await loginAs();
    renderWithRoutes([{ path: "/admin", element: <DashboardPage /> }], "/admin");
    await waitFor(() => expect(screen.getByText("Selamat datang kembali")).toBeInTheDocument());
    expect(screen.getByText("Belum ada pesan kontak.")).toBeInTheDocument();
    expect(screen.getByText("Belum ada kampanye email.")).toBeInTheDocument();
    expect(screen.getByText("Semua baik")).toBeInTheDocument();
  });
});
