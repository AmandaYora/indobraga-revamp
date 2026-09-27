// @vitest-environment jsdom
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, afterEach } from "vitest";
import { WhatsAppFab } from "@/modules/leads/components/WhatsAppFab";
import { renderWithRoutes, stubWindowOpen } from "@/test/utils";
import { failNextRequest } from "@/mocks/server";

describe("FE-S03 WhatsApp FAB", () => {
  const opened = stubWindowOpen();

  afterEach(() => {
    opened.opened.length = 0;
  });

  it("modal nama+telepon → POST → window.open(whatsapp_url)", async () => {
    const user = userEvent.setup();
    renderWithRoutes([{ path: "/", element: <WhatsAppFab /> }]);
    await user.click(screen.getByLabelText("Chat via WhatsApp"));
    await user.type(screen.getByLabelText("Nama Lengkap"), "Budi");
    await user.type(screen.getByLabelText("Nomor Telepon"), "08123456789");
    await user.click(screen.getByText("Lanjutkan ke WhatsApp"));
    await waitFor(() => expect(opened.opened).toHaveLength(1));
    expect(opened.opened[0]).toContain("https://wa.me/628123456789");
  });

  it("fallback wa.me saat API gagal", async () => {
    const user = userEvent.setup();
    failNextRequest({ status: 500, code: "INTERNAL_ERROR", message: "Simulasi gagal." });
    renderWithRoutes([{ path: "/", element: <WhatsAppFab /> }]);
    await user.click(screen.getByLabelText("Chat via WhatsApp"));
    await user.type(screen.getByLabelText("Nama Lengkap"), "Siti");
    await user.type(screen.getByLabelText("Nomor Telepon"), "085158700895");
    await user.click(screen.getByText("Lanjutkan ke WhatsApp"));
    await waitFor(() => expect(opened.opened).toHaveLength(1));
    expect(opened.opened[0]).toContain("https://wa.me/6285158700895");
  });

  it("tidak submit bila kosong", async () => {
    const user = userEvent.setup();
    renderWithRoutes([{ path: "/", element: <WhatsAppFab /> }]);
    await user.click(screen.getByLabelText("Chat via WhatsApp"));
    await user.click(screen.getByText("Lanjutkan ke WhatsApp"));
    expect(opened.opened).toHaveLength(0);
    expect(screen.getByText("Chat via WhatsApp")).toBeInTheDocument();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
});
