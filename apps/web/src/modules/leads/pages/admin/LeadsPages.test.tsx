// @vitest-environment jsdom
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Outlet } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Toaster } from "sonner";
import InquiriesAdminPage from "@/modules/leads/pages/admin/InquiriesAdminPage";
import WhatsappAdminPage from "@/modules/leads/pages/admin/WhatsappAdminPage";
import { loginAs, renderWithRoutes, stubWindowOpen } from "@/test/utils";

function leadsRoute(element: React.ReactNode, path: string) {
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
          { path: path.slice(1), element },
          { path: "admin/email-blast", element: <div>Halaman email blast</div> },
        ],
      },
    ],
    path,
  );
}

describe("FE-LD01 pesan kontak", () => {
  it("search, filter status, ubah status + catatan", async () => {
    const user = userEvent.setup();
    stubWindowOpen();
    await loginAs();
    leadsRoute(<InquiriesAdminPage />, "/admin/inquiries");
    await waitFor(() => expect(screen.getByText("Pesan Kontak")).toBeInTheDocument());

    // Search.
    await user.type(screen.getByLabelText("Cari pesan kontak"), "zzzz-tidak-ada");
    await waitFor(() => expect(screen.getByText("Tidak ada pesan kontak")).toBeInTheDocument());
    await user.clear(screen.getByLabelText("Cari pesan kontak"));

    // Kelola: ubah status + catatan internal.
    const manageButtons = await screen.findAllByText("Kelola");
    await user.click(manageButtons[0]);
    const dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).toContain("Hanya terlihat oleh admin");
    await user.click(dialog.querySelector('button[type="submit"]') as HTMLButtonElement);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    // Arsip via ConfirmDialog.
    const archiveButtons = await screen.findAllByText("Arsip");
    await user.click(archiveButtons[0]);
    const confirm = await screen.findByRole("alertdialog");
    await user.click(confirm.querySelector("button:last-child") as HTMLButtonElement);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });
});

describe("FE-LD02 aksi kirim", () => {
  it("email → email-blast dengan params; WhatsApp → wa.me", async () => {
    const user = userEvent.setup();
    const opened = stubWindowOpen();
    try {
      await loginAs();
      const { router } = leadsRoute(<InquiriesAdminPage />, "/admin/inquiries");
      await waitFor(() => expect(screen.getByText("Pesan Kontak")).toBeInTheDocument());

      const mailButtons = await screen.findAllByText("Kirim Email");
      await user.click(mailButtons[0]);
      await waitFor(() => expect(router.state.location.pathname).toBe("/admin/email-blast"));
      expect(router.state.location.search).toContain("tab=single");
      expect(router.state.location.search).toContain("email=");
    } finally {
      opened.restore();
    }
  });

  it("prospek WhatsApp: aksi kirim membuka wa.me; nomor invalid → toast", async () => {
    const user = userEvent.setup();
    const opened = stubWindowOpen();
    try {
      await loginAs();
      leadsRoute(<WhatsappAdminPage />, "/admin/whatsapp");
      await waitFor(() => expect(screen.getByText("Prospek WhatsApp")).toBeInTheDocument());
      const waButtons = await screen.findAllByText("Kirim WhatsApp");
      expect(waButtons.length).toBeGreaterThan(0);
      await user.click(waButtons[0]);
      await waitFor(() => expect(opened.opened.length).toBeGreaterThan(0));
      expect(opened.opened[0]).toContain("https://wa.me/");
    } finally {
      opened.restore();
    }
  });

  it("filter status + arsip error → toast", async () => {
    const user = userEvent.setup();
    await loginAs();
    leadsRoute(<InquiriesAdminPage />, "/admin/inquiries");
    await waitFor(() => expect(screen.getByText("Pesan Kontak")).toBeInTheDocument());
    await user.selectOptions(screen.getByLabelText("Filter status"), ["closed"]);
    await waitFor(() => expect(screen.getByText("Pesan Kontak")).toBeInTheDocument());

    const { failNextRequest } = await import("@/mocks/server");
    failNextRequest({ status: 500, code: "INTERNAL_ERROR", message: "Simulasi gagal." });
    const archiveButtons = await screen.findAllByText("Arsip");
    await user.click(archiveButtons[0]);
    const confirm = await screen.findByRole("alertdialog");
    await user.click(confirm.querySelector("button:last-child") as HTMLButtonElement);
    expect(await screen.findByText("Arsip gagal")).toBeInTheDocument();
  });

  it("prospek renggang + nomor invalid → toast", async () => {
    const user = userEvent.setup();
    const opened = stubWindowOpen();
    const { server } = await import("@/mocks/server");
    const { http, HttpResponse } = await import("msw");
    try {
      await loginAs();
      server.use(
        http.get("*/api/v1/admin/whatsapp-leads", () =>
          HttpResponse.json({
            success: true,
            message: "Data berhasil diambil.",
            data: [
              {
                id: 99901,
                name: "Renggang",
                phone: "tidak-valid",
                status: "new",
                created_at: "2026-01-01T00:00:00.000Z",
                updated_at: "2026-01-01T00:00:00.000Z",
              },
            ],
            meta: { page: 1, limit: 10, total: 1, total_pages: 1 },
          }),
        ),
      );
      leadsRoute(<WhatsappAdminPage />, "/admin/whatsapp");
      await waitFor(() => expect(screen.getByText("Prospek WhatsApp")).toBeInTheDocument());
      // Pesan fallback "—" untuk generated_message null.
      expect(await screen.findAllByText("—")).not.toHaveLength(0);
      const waButtons = await screen.findAllByText("Kirim WhatsApp");
      await user.click(waButtons[0]);
      expect(await screen.findByText("Nomor WhatsApp tidak valid")).toBeInTheDocument();
      expect(opened.opened).toHaveLength(0);
    } finally {
      opened.restore();
    }
  });

  it("pesan kontak: aksi WhatsApp valid membuka wa.me", async () => {
    const user = userEvent.setup();
    const opened = stubWindowOpen();
    try {
      await loginAs();
      leadsRoute(<InquiriesAdminPage />, "/admin/inquiries");
      await waitFor(() => expect(screen.getByText("Pesan Kontak")).toBeInTheDocument());
      const waButtons = await screen.findAllByText("Kirim WhatsApp");
      await user.click(waButtons[0]);
      await waitFor(() => expect(opened.opened.length).toBeGreaterThan(0));
      expect(opened.opened[0]).toContain("https://wa.me/");
    } finally {
      opened.restore();
    }
  });
});
