import { http, HttpResponse } from "msw";
import { db } from "@/mocks/db";
import { commonErrors, fail, ok } from "@/mocks/respond";
import {
  clampLimit,
  offsetPaginate,
  parsePage,
  requireAdmin,
  requirePermission,
} from "@/mocks/guard";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_CAMPAIGN_STATUS = new Set([
  "draft",
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled",
]);

export const emailHandlers = [
  // --- Akun email ---
  http.get("*/api/v1/admin/email-accounts", ({ request }) => {
    const session = requireAdmin(request);
    if (session instanceof Response) return session;
    const url = new URL(request.url);
    const page = parsePage(url.searchParams.get("page"));
    const limit = clampLimit(url.searchParams.get("limit"), 12, 100);
    const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
    const provider = url.searchParams.get("provider");
    const status = url.searchParams.get("status");
    let items = [...db.state.emailAccounts];
    if (provider) items = items.filter((item) => item.provider === provider);
    if (status) items = items.filter((item) => item.status === status);
    if (q) {
      items = items.filter((item) =>
        `${item.email_address ?? ""} ${item.display_name ?? ""}`.toLowerCase().includes(q),
      );
    }
    const { items: sliced, meta } = offsetPaginate(items, page, limit);
    return ok(sliced, { meta });
  }),

  http.post("*/api/v1/admin/email-accounts/google/oauth-url", async ({ request }) => {
    const session = requireAdmin(request);
    if (session instanceof Response) return session;
    const body = (await request.json()) as { email_hint?: unknown; display_name?: unknown };
    if (
      body.email_hint !== undefined &&
      (typeof body.email_hint !== "string" || !EMAIL_PATTERN.test(body.email_hint))
    ) {
      return commonErrors.validation([
        { field: "email_hint", message: "Format email tidak valid." },
      ]);
    }
    return ok(
      {
        authorization_url: `https://accounts.google.com/o/oauth2/v2/auth?client_id=mock&state=mock-state`,
        state_expires_at: db.now(),
      },
      { message: "Tautan otorisasi dibuat." },
    );
  }),

  http.post("*/api/v1/admin/email-accounts/smtp/test", async ({ request }) => {
    const session = requireAdmin(request);
    if (session instanceof Response) return session;
    await request.json();
    return ok({ ok: true }, { message: "Koneksi SMTP berhasil." });
  }),

  http.post("*/api/v1/admin/email-accounts/smtp", async ({ request }) => {
    const session = requireAdmin(request);
    if (session instanceof Response) return session;
    const body = (await request.json()) as Record<string, unknown>;
    const errors: { field: string | null; message: string }[] = [];
    if (typeof body.email_address !== "string" || !EMAIL_PATTERN.test(body.email_address)) {
      errors.push({ field: "email_address", message: "Format email tidak valid." });
    }
    if (typeof body.smtp_host !== "string" || body.smtp_host.trim() === "") {
      errors.push({ field: "smtp_host", message: "Host SMTP wajib diisi." });
    }
    const port = Number(body.smtp_port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      errors.push({ field: "smtp_port", message: "Port SMTP tidak valid." });
    }
    if (errors.length > 0) return commonErrors.validation(errors);
    const exists = db.state.emailAccounts.some(
      (item) =>
        String(item.email_address).toLowerCase() === String(body.email_address).toLowerCase(),
    );
    if (exists) {
      return fail(409, "CONFLICT", "Data yang sama sudah ada atau masih dipakai.");
    }
    const account: Record<string, unknown> = {
      id: db.takeId(),
      provider: "smtp",
      auth_type: "smtp",
      email_address: body.email_address,
      display_name: body.display_name,
      status: "connected",
      smtp_host: body.smtp_host,
      smtp_port: port,
      smtp_security: body.smtp_security,
      smtp_username: body.smtp_username,
      last_validated_at: db.now(),
      connected_at: db.now(),
      last_error: null,
      created_at: db.now(),
      updated_at: db.now(),
    };
    db.state.emailAccounts.unshift(account);
    return ok(account, { message: "Akun SMTP ditambahkan." });
  }),

  http.patch("*/api/v1/admin/email-accounts/:id", async ({ request, params }) => {
    const session = requireAdmin(request);
    if (session instanceof Response) return session;
    const item = db.state.emailAccounts.find((entry) => entry.id === Number(params.id));
    if (!item) return commonErrors.notFound();
    const body = (await request.json()) as Record<string, unknown>;
    for (const [key, value] of Object.entries(body)) {
      if (key !== "smtp_password" || value !== "") item[key] = value;
    }
    item.updated_at = db.now();
    return ok(item, { message: "Akun diperbarui." });
  }),

  http.post("*/api/v1/admin/email-accounts/:id/reconnect", ({ request, params }) => {
    const session = requireAdmin(request);
    if (session instanceof Response) return session;
    const item = db.state.emailAccounts.find((entry) => entry.id === Number(params.id));
    if (!item) return commonErrors.notFound();
    if (item.provider === "google") {
      // Kontrak hanya mendefinisikan hasil SMTP; akun Google memakai alur
      // OAuth (`POST .../google/oauth-url`) — UI tidak memanggil endpoint ini
      // untuk Google (paritas legacy).
      return commonErrors.validation([
        { field: null, message: "Akun Google dihubungkan ulang melalui OAuth." },
      ]);
    }
    item.status = "connected";
    item.last_validated_at = db.now();
    item.updated_at = db.now();
    return ok(
      { provider: "smtp", valid: true, account: item, message: "Akun terhubung ulang." },
      { message: "Akun terhubung ulang." },
    );
  }),

  http.post("*/api/v1/admin/email-accounts/:id/disable", ({ request, params }) => {
    const session = requireAdmin(request);
    if (session instanceof Response) return session;
    const item = db.state.emailAccounts.find((entry) => entry.id === Number(params.id));
    if (!item) return commonErrors.notFound();
    item.status = "disabled";
    item.updated_at = db.now();
    return ok(item, { message: "Akun dinonaktifkan." });
  }),

  http.delete("*/api/v1/admin/email-accounts/:id", ({ request, params }) => {
    const session = requireAdmin(request);
    if (session instanceof Response) return session;
    const id = Number(params.id);
    const used = db.state.campaigns.some(
      (campaign) => (campaign.sender_account as Record<string, unknown> | null)?.id === id,
    );
    if (used) {
      return fail(
        422,
        "UNPROCESSABLE_ENTITY",
        "Akun sudah dipakai kampanye dan tidak bisa dihapus.",
      );
    }
    const index = db.state.emailAccounts.findIndex((entry) => entry.id === id);
    if (index < 0) return commonErrors.notFound();
    db.state.emailAccounts.splice(index, 1);
    return ok({ id, status: "deleted" }, { message: "Akun dihapus." });
  }),

  http.get("*/api/v1/oauth/google/email/callback", ({ request }) => {
    const url = new URL(request.url);
    const state = url.searchParams.get("state");
    if (state !== "mock-state" && state !== "mock-reconnect") {
      return HttpResponse.redirect(
        "https://indobraga.com/admin/email-accounts?connected=false&status=error&reason=invalid_state",
        302,
      );
    }
    return HttpResponse.redirect(
      "https://indobraga.com/admin/email-accounts?connected=true&status=ok",
      302,
    );
  }),

  // --- Template ---
  http.get("*/api/v1/admin/email-templates", ({ request }) => {
    const session = requireAdmin(request);
    if (session instanceof Response) return session;
    const url = new URL(request.url);
    const page = parsePage(url.searchParams.get("page"));
    const limit = clampLimit(url.searchParams.get("limit"), 10, 100);
    const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
    let items = [...db.state.emailTemplates];
    if (q) {
      items = items.filter((item) =>
        `${item.name ?? ""} ${item.subject ?? ""}`.toLowerCase().includes(q),
      );
    }
    const { items: sliced, meta } = offsetPaginate(items, page, limit);
    return ok(sliced, { meta });
  }),

  http.post("*/api/v1/admin/email-templates", async ({ request }) => {
    const session = requireAdmin(request);
    if (session instanceof Response) return session;
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.name !== "string" || body.name.trim() === "") {
      return commonErrors.validation([{ field: "name", message: "Nama template wajib diisi." }]);
    }
    if (typeof body.subject !== "string" || body.subject.trim() === "") {
      return commonErrors.validation([{ field: "subject", message: "Subjek email wajib diisi." }]);
    }
    const template: Record<string, unknown> = {
      id: db.takeId(),
      name: body.name,
      subject: body.subject,
      content_mode: body.content_mode ?? "text",
      body_text: body.body_text ?? null,
      body_html: body.body_html ?? null,
      created_at: db.now(),
      updated_at: db.now(),
    };
    db.state.emailTemplates.unshift(template);
    return ok(template, { message: "Template disimpan." });
  }),

  http.patch("*/api/v1/admin/email-templates/:id", async ({ request, params }) => {
    const session = requireAdmin(request);
    if (session instanceof Response) return session;
    const item = db.state.emailTemplates.find((entry) => entry.id === Number(params.id));
    if (!item) return commonErrors.notFound();
    const body = (await request.json()) as Record<string, unknown>;
    Object.assign(item, body, { id: item.id, updated_at: db.now() });
    return ok(item, { message: "Template diperbarui." });
  }),

  http.delete("*/api/v1/admin/email-templates/:id", ({ request, params }) => {
    const session = requireAdmin(request);
    if (session instanceof Response) return session;
    const index = db.state.emailTemplates.findIndex((entry) => entry.id === Number(params.id));
    if (index < 0) return commonErrors.notFound();
    db.state.emailTemplates.splice(index, 1);
    return ok({ id: Number(params.id), status: "deleted" }, { message: "Template dihapus." });
  }),

  // --- Kampanye ---
  http.get("*/api/v1/admin/email-campaigns", ({ request }) => {
    const session = requireAdmin(request);
    if (session instanceof Response) return session;
    const url = new URL(request.url);
    const page = parsePage(url.searchParams.get("page"));
    const limit = clampLimit(url.searchParams.get("limit"), 10, 100);
    const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
    const status = url.searchParams.get("status");
    let items = [...db.state.campaigns];
    if (status) {
      if (!VALID_CAMPAIGN_STATUS.has(status)) {
        return commonErrors.validation([{ field: "status", message: "Status tidak valid." }]);
      }
      items = items.filter((item) => item.status === status);
    }
    if (q) {
      items = items.filter((item) => `${item.title ?? ""}`.toLowerCase().includes(q));
    }
    const { items: sliced, meta } = offsetPaginate(items, page, limit);
    return ok(sliced, { meta });
  }),

  http.post("*/api/v1/admin/email-campaigns/draft", async ({ request }) => {
    const session = requireAdmin(request);
    if (session instanceof Response) return session;
    const body = (await request.json()) as Record<string, unknown>;
    const errors: { field: string | null; message: string }[] = [];
    if (typeof body.title !== "string" || body.title.trim() === "") {
      errors.push({ field: "title", message: "Nama pengiriman wajib diisi." });
    }
    const account = db.state.emailAccounts.find(
      (entry) => entry.id === Number(body.email_account_id),
    );
    if (!account || account.status !== "connected") {
      errors.push({ field: "email_account_id", message: "Pilih akun pengirim yang terhubung." });
    }
    const recipients = Array.isArray(body.recipients) ? body.recipients : [];
    if (recipients.length < 1) {
      errors.push({ field: "recipients", message: "Daftar penerima tidak memiliki email valid." });
    }
    if (recipients.length > 1000) {
      errors.push({ field: "recipients", message: "Batas pengiriman adalah 1000 email." });
    }
    for (const [index, recipient] of recipients.entries()) {
      const entry = recipient as Record<string, unknown>;
      if (typeof entry.email !== "string" || !EMAIL_PATTERN.test(entry.email)) {
        errors.push({ field: `recipients.${index}.email`, message: "Format email tidak valid." });
      }
    }
    if (errors.length > 0) {
      return fail(
        422,
        "UNPROCESSABLE_ENTITY",
        "Draf belum bisa disimpan. Periksa kembali isinya.",
        errors,
      );
    }
    const id = db.takeId();
    const campaign: Record<string, unknown> = {
      id,
      title: body.title,
      subject: body.subject,
      body_text: body.body_text ?? null,
      body_html: body.body_html ?? null,
      status: "draft",
      total_recipients: recipients.length,
      queued_count: recipients.length,
      sent_count: 0,
      failed_count: 0,
      started_at: null,
      finished_at: null,
      last_error: null,
      sender_account: {
        id: account?.id,
        provider: account?.provider,
        email_address: account?.email_address,
        status: account?.status,
      },
      created_at: db.now(),
      updated_at: db.now(),
    };
    db.state.campaigns.unshift(campaign);
    db.state.campaignRecipients[id] = recipients.map((recipient, index) => {
      const entry = recipient as Record<string, unknown>;
      return {
        id: db.takeId() + index,
        campaign_id: id,
        email: entry.email,
        name: entry.name ?? null,
        status: "queued",
        attempts: 0,
        next_attempt_at: null,
        sent_at: null,
        failed_at: null,
        error_code: null,
        error_message: null,
        created_at: db.now(),
        updated_at: db.now(),
      };
    });
    db.state.campaignLogs[id] = [];
    return ok(
      { id, status: "draft", total_recipients: recipients.length },
      { message: "Draf tersimpan." },
    );
  }),

  http.post("*/api/v1/admin/email-campaigns/draft/from-audience", async ({ request }) => {
    const session = requireAdmin(request);
    if (session instanceof Response) return session;
    await request.json();
    return ok(
      { id: db.takeId(), status: "draft", total_recipients: 1 },
      { message: "Draf tersimpan." },
    );
  }),

  http.post("*/api/v1/admin/email-campaigns/draft/from-inquiries", async ({ request }) => {
    const session = requireAdmin(request);
    if (session instanceof Response) return session;
    await request.json();
    return ok(
      { id: db.takeId(), status: "draft", total_recipients: 1 },
      { message: "Draf tersimpan." },
    );
  }),

  http.get("*/api/v1/admin/email-campaigns/recipient-sources/inquiries/preview", ({ request }) => {
    const session = requireAdmin(request);
    if (session instanceof Response) return session;
    return ok({
      total: db.state.inquiries.length,
      sample: db.state.inquiries
        .slice(0, 3)
        .map((item) => ({ email: item.email, name: item.name })),
    });
  }),

  http.get("*/api/v1/admin/email-campaigns/:id", ({ request, params }) => {
    const session = requireAdmin(request);
    if (session instanceof Response) return session;
    const item = db.state.campaigns.find((entry) => entry.id === Number(params.id));
    if (!item) return commonErrors.notFound();
    return ok(item);
  }),

  http.patch("*/api/v1/admin/email-campaigns/:id", async ({ request, params }) => {
    const session = requireAdmin(request);
    if (session instanceof Response) return session;
    const item = db.state.campaigns.find((entry) => entry.id === Number(params.id));
    if (!item) return commonErrors.notFound();
    const body = (await request.json()) as Record<string, unknown>;
    Object.assign(item, body, { id: item.id, updated_at: db.now() });
    return ok(item, { message: "Kampanye diperbarui." });
  }),

  http.get("*/api/v1/admin/email-campaigns/:id/recipients", ({ request, params }) => {
    const session = requireAdmin(request);
    if (session instanceof Response) return session;
    const id = Number(params.id);
    const url = new URL(request.url);
    const page = parsePage(url.searchParams.get("page"));
    const limit = clampLimit(url.searchParams.get("limit"), 10, 100);
    const items = db.state.campaignRecipients[id] ?? [];
    const { items: sliced, meta } = offsetPaginate(items, page, limit);
    return ok(sliced, { meta });
  }),

  http.get("*/api/v1/admin/email-campaigns/:id/logs", ({ request, params }) => {
    const session = requireAdmin(request);
    if (session instanceof Response) return session;
    const permissionError = requirePermission(session, "email_campaign_logs.read");
    if (permissionError) return permissionError;
    const id = Number(params.id);
    const url = new URL(request.url);
    const page = parsePage(url.searchParams.get("page"));
    const limit = clampLimit(url.searchParams.get("limit"), 10, 100);
    const items = db.state.campaignLogs[id] ?? [];
    const { items: sliced, meta } = offsetPaginate(items, page, limit);
    return ok(sliced, { meta });
  }),

  http.post("*/api/v1/admin/email-campaigns/:id/send", ({ request, params }) => {
    const session = requireAdmin(request);
    if (session instanceof Response) return session;
    const permissionError = requirePermission(session, "email_campaigns.send");
    if (permissionError) return permissionError;
    const item = db.state.campaigns.find((entry) => entry.id === Number(params.id));
    if (!item) return commonErrors.notFound();
    if (item.status !== "draft" && item.status !== "failed") {
      return fail(422, "UNPROCESSABLE_ENTITY", "Hanya draf atau kampanye gagal yang bisa dikirim.");
    }
    item.status = "processing";
    item.started_at = db.now();
    item.updated_at = db.now();
    return ok(item, { message: "Pengiriman dimulai." });
  }),

  http.post("*/api/v1/admin/email-campaigns/:id/resend-failed", ({ request, params }) => {
    const session = requireAdmin(request);
    if (session instanceof Response) return session;
    const permissionError = requirePermission(session, "email_campaigns.send");
    if (permissionError) return permissionError;
    const item = db.state.campaigns.find((entry) => entry.id === Number(params.id));
    if (!item) return commonErrors.notFound();
    if ((item.failed_count as number) <= 0) {
      return fail(422, "UNPROCESSABLE_ENTITY", "Tidak ada penerima gagal untuk dikirim ulang.");
    }
    item.status = "processing";
    item.updated_at = db.now();
    return ok(item, { message: "Penerima gagal dijadwalkan ulang." });
  }),
];
