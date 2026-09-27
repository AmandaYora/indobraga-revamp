/**
 * Helper email blast (port `routes/-admin.email-blast.helpers.ts` legacy).
 * Validasi baris XLSX, dedupe email, limit 1.000, variabel template.
 */

export type EmailTab = "single" | "bulk";
export type ContentMode = "text" | "html";

export interface RecipientImportRow {
  email: string;
  name?: string;
  variables: Record<string, string>;
}

export interface RecipientImportState {
  fileName: string;
  rowsRead: number;
  validRecipients: RecipientImportRow[];
  duplicateCount: number;
  invalidRows: { row: number; reason: string }[];
  variableKeys: string[];
  error?: string;
}

export const RECIPIENT_LIMIT = 1000;
export const RECIPIENT_TEMPLATE_HEADERS = ["nama", "email", "perusahaan"];
export const RECIPIENT_TEMPLATE_SAMPLE = [
  ["Budi Santoso", "budi@example.com", "PT Contoh Sejahtera"],
  ["Siti Rahma", "siti@example.com", "CV Maju Bersama"],
];

export const EMPTY_IMPORT: RecipientImportState = {
  fileName: "",
  rowsRead: 0,
  validRecipients: [],
  duplicateCount: 0,
  invalidRows: [],
  variableKeys: [],
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeVariableKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function validateBody(input: {
  subject: string;
  content_mode: ContentMode;
  body_text: string;
  body_html: string;
}): { title: string; description?: string } | null {
  if (input.subject.trim() === "") return { title: "Subjek email wajib diisi." };
  if (input.content_mode === "html" && input.body_html.trim() === "") {
    return { title: "Isi email (HTML) wajib diisi." };
  }
  if (input.content_mode === "text" && input.body_text.trim() === "") {
    return { title: "Isi email wajib diisi." };
  }
  return null;
}

export function validateEmailContent(form: {
  email_account_id: string;
  subject: string;
  content_mode: ContentMode;
  body_text: string;
  body_html: string;
}): { title: string; description?: string } | null {
  if (form.email_account_id.trim() === "") return { title: "Pilih akun pengirim terlebih dahulu." };
  return validateBody(form);
}

export function validateSingle(form: {
  to_email: string;
  email_account_id: string;
  subject: string;
  content_mode: ContentMode;
  body_text: string;
  body_html: string;
}): { title: string; description?: string } | null {
  const email = form.to_email.trim().toLowerCase();
  if (email === "") return { title: "Email tujuan wajib diisi." };
  if (!EMAIL_PATTERN.test(email)) return { title: "Format email tujuan tidak valid." };
  return validateEmailContent(form);
}

export function validateBulk(
  form: {
    title: string;
    email_account_id: string;
    subject: string;
    content_mode: ContentMode;
    body_text: string;
    body_html: string;
  },
  importState: RecipientImportState,
): { title: string; description?: string } | null {
  if (form.title.trim() === "") return { title: "Nama pengiriman wajib diisi." };
  const contentError = validateEmailContent(form);
  if (contentError) return contentError;
  if (!importState.fileName) return { title: "Unggah daftar penerima terlebih dahulu." };
  if (importState.error)
    return { title: "File daftar penerima belum valid.", description: importState.error };
  if (importState.validRecipients.length <= 0)
    return { title: "Daftar penerima tidak memiliki email valid." };
  if (importState.validRecipients.length > RECIPIENT_LIMIT) {
    return {
      title: "Penerima terlalu banyak.",
      description: `Batas pengiriman adalah ${RECIPIENT_LIMIT} email.`,
    };
  }
  return null;
}

export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function textToHtml(text: string): string {
  return text
    .split("\n")
    .map((line) => `<p>${escapeHtml(line) || "<br>"}</p>`)
    .join("");
}

export function resolveBodyPayload(input: {
  content_mode: ContentMode;
  body_text: string;
  body_html: string;
}): { body_text: string; body_html: string } {
  if (input.content_mode === "html") {
    const html = input.body_html.trim();
    return { body_text: htmlToText(html), body_html: html };
  }
  const text = input.body_text.trim();
  return { body_text: text, body_html: textToHtml(text) };
}

export function buildRecipientImport(rows: unknown[][], fileName: string): RecipientImportState {
  if (rows.length === 0) {
    return { ...EMPTY_IMPORT, fileName, error: "File tidak memiliki baris data." };
  }
  const headers = (rows[0] as unknown[]).map((cell) => normalizeVariableKey(String(cell ?? "")));
  const nameIndex = headers.findIndex((header) => header === "nama" || header === "name");
  const emailIndex = headers.findIndex((header) => header === "email");
  if (nameIndex < 0 || emailIndex < 0) {
    return {
      ...EMPTY_IMPORT,
      fileName,
      error: "Kolom nama dan email wajib ada pada baris pertama.",
    };
  }
  const validRecipients: RecipientImportRow[] = [];
  const invalidRows: { row: number; reason: string }[] = [];
  const seen = new Set<string>();
  let duplicateCount = 0;
  let rowsRead = 0;
  rows.slice(1).forEach((row, index) => {
    const cells = row as unknown[];
    if (cells.every((cell) => String(cell ?? "").trim() === "")) return;
    rowsRead += 1;
    const rowNumber = index + 2;
    const email = String(cells[emailIndex] ?? "")
      .trim()
      .toLowerCase();
    if (email === "") {
      invalidRows.push({ row: rowNumber, reason: "Email kosong." });
      return;
    }
    if (!EMAIL_PATTERN.test(email)) {
      invalidRows.push({ row: rowNumber, reason: "Format email tidak valid." });
      return;
    }
    if (seen.has(email)) {
      duplicateCount += 1;
      return;
    }
    seen.add(email);
    const variables: Record<string, string> = {};
    headers.forEach((header, position) => {
      if (header === "") return;
      variables[header] = String(cells[position] ?? "").trim();
    });
    validRecipients.push({
      email,
      name: String(cells[nameIndex] ?? "").trim() || undefined,
      variables,
    });
  });
  return {
    fileName,
    rowsRead,
    validRecipients,
    duplicateCount,
    invalidRows,
    variableKeys: headers.filter((header) => header !== ""),
  };
}

export function extractTemplateVariables(...texts: string[]): string[] {
  const found = new Set<string>();
  const pattern = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  for (const text of texts) {
    let match: RegExpExecArray | null;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(text)) !== null) {
      found.add(match[1].toLowerCase());
    }
  }
  return [...found];
}

export function findMissingTemplateVariables(texts: string[], availableKeys: string[]): string[] {
  const available = new Set([...availableKeys.map((key) => key.toLowerCase()), "email", "nama"]);
  return extractTemplateVariables(...texts).filter((variable) => !available.has(variable));
}

export function renderTemplate(text: string, variables: Record<string, string>): string {
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const value = variables[key.toLowerCase()];
    return value ?? "";
  });
}

export function selectedAccountLabel(
  value: string,
  accounts: { id: number; display_name?: string | null; email_address: string }[],
): string {
  const account = accounts.find((entry) => String(entry.id) === value);
  if (!account) return "Belum dipilih";
  return `${account.display_name || account.email_address} - ${account.email_address}`;
}

export function buildSingleTitle(email: string, now: Date = new Date()): string {
  const day = now.getDate();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  return `Email ke ${email} — ${day}/${month}/${year}`;
}
