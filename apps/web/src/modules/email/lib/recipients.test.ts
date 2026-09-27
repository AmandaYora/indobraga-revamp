import { describe, expect, it } from "vitest";
import {
  buildRecipientImport,
  buildSingleTitle,
  EMPTY_IMPORT,
  extractTemplateVariables,
  findMissingTemplateVariables,
  htmlToText,
  RECIPIENT_LIMIT,
  renderTemplate,
  resolveBodyPayload,
  selectedAccountLabel,
  textToHtml,
  validateBulk,
  validateEmailContent,
  validateSingle,
} from "@/modules/email/lib/recipients";

describe("recipients", () => {
  it("limit 1000 penerima", () => {
    expect(RECIPIENT_LIMIT).toBe(1000);
  });

  it("import valid: dedupe case-insensitive, variabel kolom", () => {
    const state = buildRecipientImport(
      [
        ["nama", "email", "perusahaan"],
        ["Budi", "budi@example.com", "PT X"],
        ["Budi Lagi", "BUDI@example.com", "PT Y"],
        ["", "", ""],
        ["Tanpa Email", "", "PT Z"],
        ["Salah", "bukan-email", "PT W"],
      ],
      "penerima.xlsx",
    );
    expect(state.fileName).toBe("penerima.xlsx");
    expect(state.rowsRead).toBe(4);
    expect(state.validRecipients).toHaveLength(1);
    expect(state.validRecipients[0]).toMatchObject({
      email: "budi@example.com",
      variables: { nama: "Budi", email: "budi@example.com", perusahaan: "PT X" },
    });
    expect(state.duplicateCount).toBe(1);
    expect(state.invalidRows).toHaveLength(2);
    expect(state.variableKeys).toEqual(["nama", "email", "perusahaan"]);
  });

  it("menolak header tanpa nama/email", () => {
    const state = buildRecipientImport([["nama", "telepon"]], "salah.xlsx");
    expect(state.error).toContain("nama dan email");
    expect(state.validRecipients).toHaveLength(0);
  });

  it("validateSingle menolak email kosong & format salah", () => {
    const base = {
      email_account_id: "1",
      subject: "Halo",
      content_mode: "text" as const,
      body_text: "Isi",
      body_html: "",
    };
    expect(validateSingle({ ...base, to_email: "" })?.title).toContain("wajib diisi");
    expect(validateSingle({ ...base, to_email: "bukan-email" })?.title).toContain("tidak valid");
    expect(validateSingle({ ...base, to_email: "budi@example.com" })).toBeNull();
  });

  it("validateBulk menegakkan judul, file, dan limit", () => {
    const base = {
      title: "",
      email_account_id: "1",
      subject: "Halo",
      content_mode: "text" as const,
      body_text: "Isi",
      body_html: "",
    };
    expect(validateBulk(base, EMPTY_IMPORT)?.title).toContain("Nama pengiriman");
    expect(validateBulk({ ...base, title: "X" }, EMPTY_IMPORT)?.title).toContain("Unggah");
    const tooMany = {
      ...EMPTY_IMPORT,
      fileName: "banyak.xlsx",
      validRecipients: Array.from({ length: 1001 }, (_, i) => ({
        email: `a${i}@example.com`,
        variables: {},
      })),
    };
    expect(validateBulk({ ...base, title: "X" }, tooMany)?.title).toContain("terlalu banyak");
  });

  it("konversi html<->text", () => {
    expect(htmlToText("<p>Halo</p><p>Dunia</p>")).toBe("Halo\nDunia");
    expect(textToHtml("Halo\nDunia")).toBe("<p>Halo</p><p>Dunia</p>");
    const payload = resolveBodyPayload({
      content_mode: "html",
      body_text: "",
      body_html: " <p>Hi</p> ",
    });
    expect(payload.body_text).toBe("Hi");
    expect(payload.body_html).toBe("<p>Hi</p>");
  });

  it("variabel template: ekstrak, missing (nama/email selalu ada), render", () => {
    expect(extractTemplateVariables("Halo {{nama}}, {{ NAMA }} ke {{kota}}")).toEqual([
      "nama",
      "kota",
    ]);
    expect(findMissingTemplateVariables(["{{nama}} {{kota}}"], ["kota"])).toEqual([]);
    expect(findMissingTemplateVariables(["{{nama}} {{kota}} {{negara}}"], ["kota"])).toEqual([
      "negara",
    ]);
    expect(renderTemplate("Halo {{nama}}!", { nama: "Budi", email: "b@example.com" })).toBe(
      "Halo Budi!",
    );
    expect(renderTemplate("{{kosong}}", {})).toBe("");
  });

  it("validateEmailContent + label akun", () => {
    const base = {
      email_account_id: "",
      subject: "Halo",
      content_mode: "text" as const,
      body_text: "Isi",
      body_html: "",
    };
    expect(validateEmailContent(base)?.title).toContain("akun pengirim");
    expect(validateEmailContent({ ...base, email_account_id: "1", subject: "" })?.title).toContain(
      "Subjek",
    );
    expect(
      validateEmailContent({ ...base, email_account_id: "1", content_mode: "html", body_html: "" })
        ?.title,
    ).toContain("HTML");
    expect(
      validateEmailContent({ ...base, email_account_id: "1", body_text: "" })?.title,
    ).toContain("Isi email");
    const accounts = [{ id: 1, display_name: "Info", email_address: "info@example.com" }];
    expect(selectedAccountLabel("1", accounts)).toBe("Info - info@example.com");
    expect(selectedAccountLabel("9", accounts)).toBe("Belum dipilih");
  });

  it("import baris kosong → error", () => {
    const state = buildRecipientImport([], "kosong.xlsx");
    expect(state.error).toContain("baris data");
  });

  it("kolom header kosong dilewati", () => {
    const state = buildRecipientImport(
      [
        ["", "nama", "email"],
        ["x", "Budi", "budi@example.com"],
      ],
      "aneh.xlsx",
    );
    expect(state.variableKeys).toEqual(["nama", "email"]);
    expect(Object.keys(state.validRecipients[0].variables).sort()).toEqual(["email", "nama"]);
  });

  it("judul single otomatis memakai email + tanggal", () => {
    expect(buildSingleTitle("budi@example.com", new Date("2026-09-26T00:00:00Z"))).toContain(
      "Email ke budi@example.com",
    );
  });
});
