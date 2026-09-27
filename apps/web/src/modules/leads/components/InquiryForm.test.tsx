// @vitest-environment jsdom
import { screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Toaster } from "sonner";
import { InquiryForm } from "@/modules/leads/components/InquiryForm";
import { renderWithRoutes } from "@/test/utils";
import { failNextRequest } from "@/mocks/server";

function kontakRoute() {
  return [
    {
      path: "/kontak",
      element: (
        <>
          <InquiryForm />
          <Toaster />
        </>
      ),
    },
  ];
}

describe("FE-K02 form inquiry", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function fillValid() {
    return [
      ["Nama", "Budi Santoso"],
      ["Email", "budi@example.com"],
      ["Nomor Telepon", "08123456789"],
      ["Pesan", "Halo, saya butuh 1000 pcs jersey untuk komunitas."],
    ] as const;
  }

  it("validasi + banner sukses 4 dtk", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithRoutes(kontakRoute(), "/kontak");

    await user.click(screen.getByText("Kirim Pesan"));
    expect(await screen.findByText("Nama minimal 2 karakter.")).toBeInTheDocument();

    for (const [label, value] of fillValid()) {
      await user.type(screen.getByLabelText(label as string), value as string);
    }
    await user.click(screen.getByText("Kirim Pesan"));
    expect(await screen.findByText("Pesan berhasil dikirim.")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    await waitFor(() => expect(screen.queryByText("Pesan berhasil dikirim.")).toBeNull());
  });

  it("honeypot terisi → drop diam-diam tanpa request", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithRoutes(kontakRoute(), "/kontak");
    const honeypot = document.querySelector('input[name="website"]') as HTMLInputElement;
    honeypot.value = "http://spam.test";
    for (const [label, value] of fillValid()) {
      await user.type(screen.getByLabelText(label as string), value as string);
    }
    await user.click(screen.getByText("Kirim Pesan"));
    // Tidak ada banner sukses maupun toast error.
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.queryByText("Pesan berhasil dikirim.")).toBeNull();
  });

  it("gagal kirim → toast error", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    failNextRequest({ status: 500, code: "INTERNAL_ERROR", message: "Simulasi gagal." });
    renderWithRoutes(kontakRoute(), "/kontak");
    for (const [label, value] of fillValid()) {
      await user.type(screen.getByLabelText(label as string), value as string);
    }
    await user.click(screen.getByText("Kirim Pesan"));
    expect(await screen.findByText("Pesan gagal dikirim")).toBeInTheDocument();
  });

  it("perusahaan opsional ikut terkirim", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithRoutes(kontakRoute(), "/kontak");
    for (const [label, value] of fillValid()) {
      await user.type(screen.getByLabelText(label as string), value as string);
    }
    await user.type(screen.getByLabelText(/Perusahaan/), "PT Maju");
    await user.click(screen.getByText("Kirim Pesan"));
    expect(await screen.findByText("Pesan berhasil dikirim.")).toBeInTheDocument();
  });

  it("422 dengan pesan per field → error di bawah field", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { server } = await import("@/mocks/server");
    const { http, HttpResponse } = await import("msw");
    server.use(
      http.post("*/api/v1/public/inquiries", () =>
        HttpResponse.json(
          {
            success: false,
            code: "VALIDATION_ERROR",
            message: "Periksa kembali isian yang belum sesuai.",
            errors: [{ field: "email", message: "Email sudah terdaftar." }],
            request_id: "req_test",
          },
          { status: 400 },
        ),
      ),
    );
    renderWithRoutes(kontakRoute(), "/kontak");
    for (const [label, value] of fillValid()) {
      await user.type(screen.getByLabelText(label as string), value as string);
    }
    await user.click(screen.getByText("Kirim Pesan"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Email sudah terdaftar.");
  });
});
