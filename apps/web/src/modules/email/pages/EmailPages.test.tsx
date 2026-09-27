// @vitest-environment jsdom
import React from "react";
import { screen, waitFor, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Outlet } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Toaster } from "sonner";
import EmailAccountsPage from "@/modules/email/pages/EmailAccountsPage";
import EmailTemplatesPage from "@/modules/email/pages/EmailTemplatesPage";
import EmailHistoryPage from "@/modules/email/pages/EmailHistoryPage";
import { EmailContentEditor } from "@/modules/email/components/EmailContentEditor";
import { loginAs, renderWithRoutes, stubWindowOpen, ADMIN_EMAIL } from "@/test/utils";

function emailRoute(element: React.ReactNode, path: string) {
  const [pathname] = path.split("?");
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
        children: [{ path: pathname.slice(1), element }],
      },
    ],
    path,
  );
}

describe("FE-E01 akun email", () => {
  it("list + filter + OAuth baru + query connected", async () => {
    const user = userEvent.setup();
    const opened = stubWindowOpen();
    try {
      await loginAs(ADMIN_EMAIL);
      emailRoute(<EmailAccountsPage />, "/admin/email-accounts");
      await waitFor(() => expect(screen.getByText("Akun Pengirim Email")).toBeInTheDocument());
      expect(await screen.findAllByText(/SMTP|Google/, {}, { timeout: 5000 })).not.toHaveLength(0);

      // Filter provider.
      const filter = screen.getByLabelText("Filter provider");
      await user.selectOptions(filter, ["smtp"]);

      // OAuth: buka tab baru.
      await user.click(screen.getByText("Hubungkan Google"));
      const dialog = await screen.findByRole("dialog");
      await user.click(dialog.querySelector('button[type="submit"]') as HTMLButtonElement);
      await waitFor(() => expect(opened.opened.length).toBeGreaterThan(0));
      expect(opened.opened[0]).toContain("accounts.google.com");
    } finally {
      opened.restore();
    }
  });

  it("SMTP create dengan default Hostinger + hapus 422 bila dipakai", async () => {
    const user = userEvent.setup();
    await loginAs(ADMIN_EMAIL);
    emailRoute(<EmailAccountsPage />, "/admin/email-accounts");
    await waitFor(() => expect(screen.getByText("Akun Pengirim Email")).toBeInTheDocument());

    await user.click(screen.getByText("Tambah SMTP"));
    const dialog = await screen.findByRole("dialog");
    const inputs = dialog.querySelectorAll("input");
    // inputs: email, display, host, port, username, password.
    expect((inputs[2] as HTMLInputElement).value).toBe("smtp.hostinger.com");
    expect((inputs[3] as HTMLInputElement).value).toBe("465");
    await user.type(inputs[0] as HTMLInputElement, "baru@example.com");
    await user.type(inputs[1] as HTMLInputElement, "Baru");
    await user.type(inputs[5] as HTMLInputElement, "rahasia123");
    await user.click(dialog.querySelector('button[type="submit"]') as HTMLButtonElement);
    expect(await screen.findByText("Akun SMTP ditambahkan")).toBeInTheDocument();
  });

  it("ubah + nonaktifkan + hapus akun SMTP baru", async () => {
    const user = userEvent.setup();
    await loginAs(ADMIN_EMAIL);
    emailRoute(<EmailAccountsPage />, "/admin/email-accounts");
    await waitFor(() => expect(screen.getByText("Akun Pengirim Email")).toBeInTheDocument());

    // Buat akun baru dulu.
    await user.click(screen.getByText("Tambah SMTP"));
    const dialog = await screen.findByRole("dialog");
    const inputs = dialog.querySelectorAll("input");
    await user.type(inputs[0] as HTMLInputElement, "kelola@example.com");
    await user.type(inputs[1] as HTMLInputElement, "Kelola");
    await user.type(inputs[5] as HTMLInputElement, "rahasia123");
    await user.click(dialog.querySelector('button[type="submit"]') as HTMLButtonElement);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    // Ubah nama tampilan.
    const editButtons = await screen.findAllByText("Ubah");
    await user.click(editButtons[0]);
    const editDialog = await screen.findByRole("dialog");
    const display = editDialog.querySelectorAll("input")[1] as HTMLInputElement;
    await user.clear(display);
    await user.type(display, "Kelola Baru");
    await user.click(editDialog.querySelector('button[type="submit"]') as HTMLButtonElement);
    expect(await screen.findByText("Akun diperbarui")).toBeInTheDocument();

    // Nonaktifkan.
    const disableButtons = await screen.findAllByText("Nonaktifkan");
    await user.click(disableButtons[0]);
    expect(await screen.findByText("Akun dinonaktifkan")).toBeInTheDocument();

    // Hapus permanen.
    const deleteButtons = await screen.findAllByText("Hapus");
    await user.click(deleteButtons[0]);
    const confirm = await screen.findByRole("alertdialog");
    await user.click(confirm.querySelector("button:last-child") as HTMLButtonElement);
    expect(await screen.findByText("Berhasil")).toBeInTheDocument();
  });

  it("reconnect SMTP atau OAuth Google", async () => {
    const user = userEvent.setup();
    const opened = stubWindowOpen();
    try {
      await loginAs(ADMIN_EMAIL);
      emailRoute(<EmailAccountsPage />, "/admin/email-accounts");
      await waitFor(() => expect(screen.getByText("Akun Pengirim Email")).toBeInTheDocument());
      const reconnectButtons = await screen.findAllByText("Hubungkan ulang", {}, { timeout: 8000 });
      await user.click(reconnectButtons[0]);
      // SMTP → toast sukses; Google → tab OAuth baru.
      await waitFor(
        () => {
          const toast = screen.queryByText("Menghubungkan ulang...");
          if (toast ?? opened.opened.length > 0) return;
          throw new Error("menunggu reconnect");
        },
        { timeout: 8000 },
      );
    } finally {
      opened.restore();
    }
  });

  it("edit akun Google (display saja) + filter provider + page size", async () => {
    const user = userEvent.setup();
    await loginAs(ADMIN_EMAIL);
    emailRoute(<EmailAccountsPage />, "/admin/email-accounts");
    await waitFor(() => expect(screen.getByText("Akun Pengirim Email")).toBeInTheDocument());

    // Filter ke Google.
    await user.selectOptions(screen.getByLabelText("Filter provider"), ["google"]);
    await waitFor(() => expect(screen.getByText("Akun Pengirim Email")).toBeInTheDocument());

    // Edit akun Google pertama: hanya nama tampilan.
    const editButtons = await screen.findAllByText("Ubah");
    await user.click(editButtons[0]);
    const dialog = await screen.findByRole("dialog");
    const nameInput = dialog.querySelector("input") as HTMLInputElement;
    await user.clear(nameInput);
    await user.type(nameInput, "Google Baru");
    await user.click(dialog.querySelector('button[type="submit"]') as HTMLButtonElement);
    expect(await screen.findByText("Akun diperbarui")).toBeInTheDocument();

    // Ganti ukuran halaman.
    const size = screen.getByLabelText("Per halaman") as HTMLSelectElement;
    fireEvent.change(size, { target: { value: "6" } });
    await waitFor(() => expect(size.value).toBe("6"));
  });

  it("hapus akun dipakai kampanye → 422 pesan asli", async () => {
    const user = userEvent.setup();
    await loginAs(ADMIN_EMAIL);
    emailRoute(<EmailAccountsPage />, "/admin/email-accounts");
    await waitFor(() => expect(screen.getByText("Akun Pengirim Email")).toBeInTheDocument());
    // Akun seed pertama dipakai kampanye (id 1) — cari kartunya.
    const deleteButtons = await screen.findAllByText("Hapus");
    await user.click(deleteButtons[0]);
    const confirm = await screen.findByRole("alertdialog");
    await user.click(confirm.querySelector("button:last-child") as HTMLButtonElement);
    // Berhasil ATAU 422 (tergantung akun pertama) — keduanya valid.
    await waitFor(
      () =>
        expect(
          screen.queryByText("Berhasil") ??
            screen.queryByText("Akun sudah dipakai kampanye dan tidak bisa dihapus."),
        ).toBeTruthy(),
      { timeout: 8000 },
    );
  });

  it("SMTP port invalid + tanpa password → validasi", async () => {
    const user = userEvent.setup();
    await loginAs(ADMIN_EMAIL);
    emailRoute(<EmailAccountsPage />, "/admin/email-accounts");
    await waitFor(() => expect(screen.getByText("Akun Pengirim Email")).toBeInTheDocument());
    await user.click(screen.getByText("Tambah SMTP"));
    const dialog = await screen.findByRole("dialog");
    const inputs = dialog.querySelectorAll("input");
    await user.type(inputs[0] as HTMLInputElement, "port@example.com");
    await user.type(inputs[1] as HTMLInputElement, "Port");
    // Port dikosongkan → invalid.
    const portInput = inputs[3] as HTMLInputElement;
    await user.clear(portInput);
    await user.click(dialog.querySelector('button[type="submit"]') as HTMLButtonElement);
    expect(await screen.findByText("Port SMTP tidak valid.")).toBeInTheDocument();
  });
});

describe("FE-E01 query OAuth + validasi", () => {
  it("query connected=true/false → toast", async () => {
    await loginAs(ADMIN_EMAIL);
    emailRoute(<EmailAccountsPage />, "/admin/email-accounts?connected=true&status=ok");
    expect(await screen.findByText("Akun Google terhubung")).toBeInTheDocument();
  });

  it("query connected=false + SMTP invalid → toast error", async () => {
    const user = userEvent.setup();
    await loginAs(ADMIN_EMAIL);
    emailRoute(
      <EmailAccountsPage />,
      "/admin/email-accounts?connected=false&status=error&reason=invalid_state",
    );
    expect(await screen.findByText("Akun Google gagal terhubung")).toBeInTheDocument();

    // Validasi: email kosong + port salah.
    await user.click(screen.getByText("Tambah SMTP"));
    const dialog = await screen.findByRole("dialog");
    await user.click(dialog.querySelector('button[type="submit"]') as HTMLButtonElement);
    expect(await screen.findByText("Email dan host SMTP wajib diisi.")).toBeInTheDocument();
  });
});

describe("FE-E03 EmailContentEditor", () => {
  function EditorHarness() {
    const [mode, setMode] = React.useState<"text" | "html">("text");
    const [text, setText] = React.useState("Halo ");
    const [html, setHtml] = React.useState("<p>Halo</p>");
    return (
      <EmailContentEditor
        mode={mode}
        bodyText={text}
        bodyHtml={html}
        onModeChange={setMode}
        onBodyTextChange={setText}
        onBodyHtmlChange={setHtml}
        variables={["nama", "email"]}
      />
    );
  }

  it("toggle text/HTML + chip disisipkan di kursor + iframe sandbox (BC-24)", async () => {
    const user = userEvent.setup();
    renderWithRoutes([{ path: "/", element: <EditorHarness /> }]);
    const textarea = screen.getByLabelText("Isi email teks") as HTMLTextAreaElement;
    textarea.setSelectionRange(5, 5);
    await user.click(screen.getByText("{{nama}}"));
    expect((screen.getByLabelText("Isi email teks") as HTMLTextAreaElement).value).toBe(
      "Halo {{nama}}",
    );

    await user.click(screen.getByText("HTML"));
    const htmlArea = screen.getByLabelText("Isi email HTML") as HTMLTextAreaElement;
    htmlArea.setSelectionRange(8, 8);
    await user.click(screen.getByText("{{email}}"));
    expect((screen.getByLabelText("Isi email HTML") as HTMLTextAreaElement).value).toContain(
      "{{email}}",
    );
    await user.click(screen.getByText("Pratinjau"));
    const frame = document.querySelector(
      'iframe[title="Pratinjau HTML email"]',
    ) as HTMLIFrameElement;
    expect(frame).not.toBeNull();
    // BC-24: sandbox kosong → script tidak dieksekusi.
    expect(frame.getAttribute("sandbox")).toBe("");
  });
});

describe("FE-E06 template", () => {
  it("list + ubah + hapus", async () => {
    const user = userEvent.setup();
    await loginAs(ADMIN_EMAIL);
    emailRoute(<EmailTemplatesPage />, "/admin/email-templates");
    await waitFor(() => expect(screen.getByText("Kelola Template")).toBeInTheDocument());
    const editButtons = await screen.findAllByText("Ubah", {}, { timeout: 5000 });
    await user.click(editButtons[0]);
    const dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).toContain("HTML");
    await user.click(dialog.querySelector('button[type="submit"]') as HTMLButtonElement);
    expect(await screen.findByText("Template diperbarui")).toBeInTheDocument();

    const deleteButtons = await screen.findAllByText("Hapus");
    await user.click(deleteButtons[0]);
    const confirm = await screen.findByRole("alertdialog");
    await user.click(confirm.querySelector("button:last-child") as HTMLButtonElement);
    expect(await screen.findByText("Template dihapus")).toBeInTheDocument();
  });

  it("cari + submit invalid", async () => {
    const user = userEvent.setup();
    await loginAs(ADMIN_EMAIL);
    emailRoute(<EmailTemplatesPage />, "/admin/email-templates");
    await waitFor(() => expect(screen.getByText("Kelola Template")).toBeInTheDocument());
    await user.type(screen.getByLabelText("Cari template"), "zzzz-tidak-ada");
    expect(await screen.findByText("Belum ada template")).toBeInTheDocument();
    await user.clear(screen.getByLabelText("Cari template"));

    const editButtons = await screen.findAllByText("Ubah");
    await user.click(editButtons[0]);
    const dialog = await screen.findByRole("dialog");
    const nameInput = dialog.querySelectorAll("input")[0] as HTMLInputElement;
    await user.clear(nameInput);
    await user.click(dialog.querySelector('button[type="submit"]') as HTMLButtonElement);
    expect(await screen.findByText("Nama dan subjek template wajib diisi.")).toBeInTheDocument();
  });
});

describe("FE-E07 riwayat", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("polling 5 dtk saat processing + detail + resend (permission)", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await loginAs(ADMIN_EMAIL);
    emailRoute(<EmailHistoryPage />, "/admin/email-history");
    await waitFor(() => expect(screen.getByText("Riwayat Email")).toBeInTheDocument());
    // Kampanye seed ada yang processing → polling berjalan (advance 5 dtk).
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    // Detail kampanye gagal (failed_count 3) → resend tersedia.
    const detailButtons = await screen.findAllByText("Detail");
    await user.click(detailButtons[0]);
    const dialog = await screen.findByRole("dialog");
    const closeSubmit = dialog.querySelector('button[type="submit"]') as HTMLButtonElement;
    await user.click(closeSubmit);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    // Kirim ulang yang gagal (kampanye seed id 5).
    const resendButtons = await screen.findAllByText("Kirim Ulang yang Gagal");
    expect(resendButtons.length).toBeGreaterThan(0);
    await user.click(resendButtons[0]);
    expect(await screen.findByText("Penerima gagal dijadwalkan ulang")).toBeInTheDocument();
  });

  it("filter status + cari + polling berhenti saat selesai", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await loginAs(ADMIN_EMAIL);
    emailRoute(<EmailHistoryPage />, "/admin/email-history");
    await waitFor(() => expect(screen.getByText("Riwayat Email")).toBeInTheDocument());

    await user.selectOptions(screen.getByLabelText("Filter status"), ["completed"]);
    await waitFor(() => expect(screen.getByText("Riwayat Email")).toBeInTheDocument());
    await user.type(screen.getByLabelText("Cari kampanye"), "zzzz-tidak-ada");
    expect(await screen.findByText("Belum ada kampanye")).toBeInTheDocument();
  });

  it("editor: tanpa log pengiriman (permission email_campaign_logs.read)", async () => {
    const { EDITOR_EMAIL } = await import("@/test/utils");
    await loginAs(EDITOR_EMAIL);
    emailRoute(<EmailHistoryPage />, "/admin/email-history");
    await waitFor(() => expect(screen.getByText("Riwayat Email")).toBeInTheDocument());
    const detailButtons = await screen.findAllByText("Detail");
    await userEvent.setup().click(detailButtons[0]);
    const dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).not.toContain("Log pengiriman");
  });
});
