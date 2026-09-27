// @vitest-environment jsdom
import { screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Outlet, useSearchParams } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { Toaster } from "sonner";
import EmailBlastPage from "@/modules/email/pages/EmailBlastPage";
import { loginAs, renderWithRoutes, ADMIN_EMAIL } from "@/test/utils";

vi.mock("read-excel-file/browser", () => ({
  default: async () => [
    ["nama", "email", "perusahaan"],
    ["Budi", "budi@example.com", "PT X"],
    ["Budi Duplikat", "BUDI@example.com", "PT X"],
    ["Salah", "bukan-email", "PT Y"],
    ["Siti", "siti@example.com", "CV Y"],
  ],
}));

vi.mock("write-excel-file/browser", () => ({
  default: async () => undefined,
}));

function blastRoute(initialPath: string) {
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
        children: [{ path: "admin/email-blast", element: <BlastHarness /> }],
      },
    ],
    initialPath,
  );
}

function BlastHarness() {
  const [params] = useSearchParams();
  return (
    <>
      <p data-testid="tab">tab={params.get("tab") ?? "single"}</p>
      <EmailBlastPage />
    </>
  );
}

describe("FE-E02/E05 blast single", () => {
  it("prefill dari inquiry + validasi + pratinjau + kirim", async () => {
    const user = userEvent.setup();
    await loginAs(ADMIN_EMAIL);
    blastRoute("/admin/email-blast?tab=single&email=budi%40example.com&name=Budi");
    await waitFor(() => expect(screen.getByText("Kirim Email")).toBeInTheDocument());
    expect(screen.getByTestId("tab")).toHaveTextContent("tab=single");
    expect(screen.getByLabelText("Email tujuan")).toHaveValue("budi@example.com");

    // Pilih akun + subjek + isi.
    const accountSelect = screen.getByLabelText("Akun pengirim") as HTMLSelectElement;
    await waitFor(() => expect(accountSelect.options.length).toBeGreaterThan(1));
    await user.selectOptions(accountSelect, [accountSelect.options[1].value]);
    await user.type(screen.getByLabelText("Subjek"), "Halo ");
    // Kurung kurawal memakai paste (user.type mengartikan `{...}` sebagai tombol khusus).
    await user.click(screen.getByLabelText("Subjek"));
    await user.paste("{{nama}}");
    await user.click(screen.getByLabelText("Isi email teks"));
    await user.paste("Halo {{nama}}, apa kabar?");

    // Pratinjau mengisi {{var}}.
    await user.click(screen.getByText("Pratinjau"));
    const preview = await screen.findByRole("dialog");
    expect(preview.textContent).toContain("Halo Budi");

    // Template tersimpan memuat daftar.
    expect(screen.getByLabelText("Pilih template")).toBeInTheDocument();

    // Kirim: draft + send → toast jumlah penerima.
    await user.click(preview.querySelector('button[type="submit"]') as HTMLButtonElement);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await user.click(screen.getByText("Kirim"));
    const confirm = await screen.findByRole("alertdialog");
    await user.click(confirm.querySelector("button:last-child") as HTMLButtonElement);
    expect(await screen.findByText("Email dikirim ke 1 penerima")).toBeInTheDocument();
  }, 20000);

  it("validasi: akun & subjek wajib + simpan draf", async () => {
    const user = userEvent.setup();
    await loginAs(ADMIN_EMAIL);
    blastRoute("/admin/email-blast?tab=single&email=budi%40example.com&name=Budi");
    await waitFor(() => expect(screen.getByText("Kirim Email")).toBeInTheDocument());

    // Tanpa akun pengirim → toast validasi.
    await user.type(screen.getByLabelText("Subjek"), "Halo");
    await user.click(screen.getByText("Kirim"));
    expect(await screen.findByText("Pilih akun pengirim terlebih dahulu.")).toBeInTheDocument();

    // Simpan draf butuh akun valid.
    const accountSelect = screen.getByLabelText("Akun pengirim") as HTMLSelectElement;
    await waitFor(() => expect(accountSelect.options.length).toBeGreaterThan(1));
    await user.selectOptions(accountSelect, [accountSelect.options[1].value]);
    await user.type(screen.getByLabelText("Isi email teks"), "Halo semua");
    await user.click(screen.getByText("Simpan Draf"));
    expect(await screen.findByText(/Draf tersimpan/)).toBeInTheDocument();
  }, 20000);

  it("pakai template mengisi subjek + konten", async () => {
    const user = userEvent.setup();
    await loginAs(ADMIN_EMAIL);
    blastRoute("/admin/email-blast?tab=single");
    await waitFor(() => expect(screen.getByText("Kirim Email")).toBeInTheDocument());
    const templateSelect = screen.getByLabelText("Pilih template") as HTMLSelectElement;
    await waitFor(() => expect(templateSelect.options.length).toBeGreaterThan(1));
    await user.selectOptions(templateSelect, [templateSelect.options[1].value]);
    expect(await screen.findByText("Template dipakai")).toBeInTheDocument();
    expect((screen.getByLabelText("Subjek") as HTMLInputElement).value.length).toBeGreaterThan(0);
  }, 20000);

  it("tab bulk: upload XLSX + unduh template + peringatan variabel", async () => {
    const user = userEvent.setup();
    await loginAs(ADMIN_EMAIL);
    blastRoute("/admin/email-blast?tab=bulk");
    await waitFor(() => expect(screen.getByText("Kirim Email")).toBeInTheDocument());
    expect(screen.getByTestId("tab")).toHaveTextContent("tab=bulk");
    expect(screen.getByLabelText("Nama pengiriman")).toBeInTheDocument();
    expect(screen.getByText("Unggah XLSX")).toBeInTheDocument();
    expect(screen.getByText("Unduh template XLSX")).toBeInTheDocument();

    // Variabel tak dikenal → peringatan (setelah isi subjek+body).
    await user.type(screen.getByLabelText("Subjek"), "Promo ");
    await user.click(screen.getByLabelText("Subjek"));
    await user.paste("{{negara}}");
    expect(await screen.findByText(/tidak ada di file penerima/)).toBeInTheDocument();

    // Unggah XLSX (mock) → 2 penerima valid.
    const fileInput = document.querySelector(
      'input[aria-label="File penerima XLSX"]',
    ) as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: {
        files: [
          new File(["xlsx"], "penerima.xlsx", {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }),
        ],
      },
    });
    expect(await screen.findByText(/2 email valid/)).toBeInTheDocument();

    // Simpan sebagai template.
    await user.click(screen.getByText("Simpan sebagai Template"));
    const saveDialog = await screen.findByRole("dialog");
    await user.type(saveDialog.querySelector("input") as HTMLInputElement, "Template Uji");
    await user.click(saveDialog.querySelector('button[type="submit"]') as HTMLButtonElement);
    expect(await screen.findByText("Template disimpan")).toBeInTheDocument();
  }, 25000);

  it("bulk kirim penuh: import → judul → kirim", async () => {
    const user = userEvent.setup();
    await loginAs(ADMIN_EMAIL);
    blastRoute("/admin/email-blast?tab=bulk");
    await waitFor(() => expect(screen.getByText("Kirim Email")).toBeInTheDocument());

    const fileInput = document.querySelector(
      'input[aria-label="File penerima XLSX"]',
    ) as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: {
        files: [
          new File(["xlsx"], "penerima.xlsx", {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }),
        ],
      },
    });
    expect(await screen.findByText(/2 email valid/)).toBeInTheDocument();

    await user.type(screen.getByLabelText("Nama pengiriman"), "Blast Uji");
    const accountSelect = screen.getByLabelText("Akun pengirim") as HTMLSelectElement;
    await waitFor(() => expect(accountSelect.options.length).toBeGreaterThan(1));
    await user.selectOptions(accountSelect, [accountSelect.options[1].value]);
    await user.type(screen.getByLabelText("Subjek"), "Promo");
    await user.click(screen.getByLabelText("Isi email teks"));
    await user.paste("Halo semua");
    await user.click(screen.getByText("Kirim"));
    const confirm = await screen.findByRole("alertdialog");
    await user.click(confirm.querySelector("button:last-child") as HTMLButtonElement);
    expect(await screen.findByText("Email dikirim ke 2 penerima")).toBeInTheDocument();
  }, 25000);

  it("ganti tab single↔bulk + tanpa template + simpan template invalid", async () => {
    const user = userEvent.setup();
    await loginAs(ADMIN_EMAIL);
    blastRoute("/admin/email-blast?tab=single");
    await waitFor(() => expect(screen.getByText("Kirim Email")).toBeInTheDocument());
    expect(screen.getByTestId("tab")).toHaveTextContent("tab=single");

    // Ganti tab via tombol (search params ikut berubah).
    await user.click(screen.getByText("Massal"));
    expect(await screen.findByTestId("tab")).toHaveTextContent("tab=bulk");
    await user.click(screen.getByText("Tunggal"));
    expect(await screen.findByTestId("tab")).toHaveTextContent("tab=single");

    // Pilih "Tanpa template" → tidak ada toast, form tidak berubah.
    const templateSelect = screen.getByLabelText("Pilih template") as HTMLSelectElement;
    await waitFor(() => expect(templateSelect.options.length).toBeGreaterThan(1));
    await user.selectOptions(templateSelect, [""]);
    expect(screen.queryByText("Template dipakai")).toBeNull();

    // Simpan template tanpa nama → validasi.
    await user.click(screen.getByText("Simpan sebagai Template"));
    const saveDialog = await screen.findByRole("dialog");
    await user.click(saveDialog.querySelector('button[type="submit"]') as HTMLButtonElement);
    expect(await screen.findByText("Nama template dan subjek wajib diisi.")).toBeInTheDocument();
  }, 25000);

  it("bulk tanpa judul + tanpa file → validasi", async () => {
    const user = userEvent.setup();
    await loginAs(ADMIN_EMAIL);
    blastRoute("/admin/email-blast?tab=bulk");
    await waitFor(() => expect(screen.getByText("Kirim Email")).toBeInTheDocument());
    await user.click(screen.getByText("Kirim"));
    expect(await screen.findByText("Nama pengiriman wajib diisi.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Nama pengiriman"), "X");
    await user.click(screen.getByText("Kirim"));
    expect(await screen.findByText("Pilih akun pengirim terlebih dahulu.")).toBeInTheDocument();
  }, 25000);
});
