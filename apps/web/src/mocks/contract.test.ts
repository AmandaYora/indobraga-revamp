import axios, { type AxiosInstance } from "axios";
import { beforeEach, describe, expect, it } from "vitest";
import { contractFor, assertErrorEnvelope } from "@/mocks/openapi";
import { MOCK_CSRF_TOKEN, MOCK_PASSWORD } from "@/mocks/db";

const ADMIN_EMAIL = "admin@example.test";
const EDITOR_EMAIL = "editor@example.test";

let raw: AxiosInstance;

beforeEach(() => {
  raw = axios.create({ baseURL: "http://localhost", validateStatus: () => true });
  raw.defaults.headers.common["x-csrf-token"] = MOCK_CSRF_TOKEN;
});

async function login(email: string = ADMIN_EMAIL) {
  const res = await raw.post("/api/v1/auth/login", { email, password: MOCK_PASSWORD });
  expect(res.status).toBe(200);
  return res.data.data.user;
}

function check(method: string, path: string, status: number, body: unknown) {
  contractFor(method, path).assertResponse(status, body);
}

function checkRequest(method: string, path: string, body: unknown) {
  contractFor(method, path).assertRequest(body);
}

describe("kontrak mock: publik", () => {
  it("GET site-settings/home/facilities", async () => {
    for (const path of [
      "/api/v1/public/site-settings",
      "/api/v1/public/home",
      "/api/v1/public/facilities",
    ]) {
      const res = await raw.get(path);
      expect(res.status).toBe(200);
      check("get", path, 200, res.data);
    }
  });

  it("GET portfolio cursor + kategori + galeri + berita + detail", async () => {
    const list = await raw.get("/api/v1/public/portfolio", { params: { limit: 8 } });
    expect(list.status).toBe(200);
    check("get", "/api/v1/public/portfolio", 200, list.data);
    expect(list.data.meta.has_more).toBe(true);

    const page2 = await raw.get("/api/v1/public/portfolio", {
      params: { limit: 8, cursor: list.data.meta.next_cursor },
    });
    check("get", "/api/v1/public/portfolio", 200, page2.data);

    const cats = await raw.get("/api/v1/public/portfolio-categories");
    check("get", "/api/v1/public/portfolio-categories", 200, cats.data);

    const gallery = await raw.get("/api/v1/public/gallery", { params: { limit: 8 } });
    check("get", "/api/v1/public/gallery", 200, gallery.data);

    const news = await raw.get("/api/v1/public/news", { params: { page: 1, limit: 6 } });
    check("get", "/api/v1/public/news", 200, news.data);
    expect(news.data.meta.total_pages).toBeGreaterThanOrEqual(1);

    const detail = await raw.get("/api/v1/public/news/kapasitas-produksi-90000-pcs");
    check("get", "/api/v1/public/news/{slug}", 200, detail.data);

    const missing = await raw.get("/api/v1/public/news/slug-asing-xyz");
    expect(missing.status).toBe(404);
    check("get", "/api/v1/public/news/{slug}", 404, missing.data);
    assertErrorEnvelope(missing.data);
  });

  it("GET seo default + per route + 404", async () => {
    const home = await raw.get("/api/v1/public/seo");
    check("get", "/api/v1/public/seo", 200, home.data);
    const route = await raw.get("/api/v1/public/seo/fasilitas");
    check("get", "/api/v1/public/seo/{route}", 200, route.data);
    const unknown = await raw.get("/api/v1/public/seo/rute-asing");
    expect(unknown.status).toBe(404);
    check("get", "/api/v1/public/seo/{route}", 404, unknown.data);
  });

  it("POST inquiries: validasi, honeypot, rate limit terdokumentasi", async () => {
    const valid = {
      name: "Budi Santoso",
      email: "budi@example.com",
      phone: "08123456789",
      message: "Halo, saya butuh 1000 pcs jersey.",
    };
    checkRequest("post", "/api/v1/public/inquiries", valid);
    const res = await raw.post("/api/v1/public/inquiries", valid);
    expect(res.status).toBe(200);
    check("post", "/api/v1/public/inquiries", 200, res.data);

    const bad = await raw.post("/api/v1/public/inquiries", {
      name: "x",
      email: "salah",
      phone: "1",
      message: "pendek",
    });
    expect(bad.status).toBe(400);
    check("post", "/api/v1/public/inquiries", 400, bad.data);
    assertErrorEnvelope(bad.data);

    const honeypot = await raw.post("/api/v1/public/inquiries", {
      ...valid,
      website: "http://spam.test",
    });
    expect(honeypot.status).toBe(200);
    expect(honeypot.data.data.id).toBe(0);
  });

  it("POST whatsapp-leads valid + invalid", async () => {
    const valid = { name: "Siti", phone: "08123456789", message: "Halo Indobraga" };
    checkRequest("post", "/api/v1/public/whatsapp-leads", valid);
    const res = await raw.post("/api/v1/public/whatsapp-leads", valid);
    check("post", "/api/v1/public/whatsapp-leads", 200, res.data);
    expect(res.data.data.whatsapp_url).toContain("https://wa.me/");

    const bad = await raw.post("/api/v1/public/whatsapp-leads", { name: "x", phone: "1" });
    expect(bad.status).toBe(400);
    check("post", "/api/v1/public/whatsapp-leads", 400, bad.data);
  });

  it("robots & sitemap bukan JSON (tipe konten kontrak)", async () => {
    const robots = await raw.get("/robots.txt");
    expect(robots.status).toBe(200);
    expect(String(robots.headers["content-type"])).toContain("text/plain");
    const sitemap = await raw.get("/sitemap.xml");
    expect(sitemap.status).toBe(200);
    expect(String(sitemap.headers["content-type"])).toContain("xml");
  });
});

describe("kontrak mock: auth", () => {
  it("login/logout/me + 401 + 429", async () => {
    const body = { email: ADMIN_EMAIL, password: MOCK_PASSWORD };
    checkRequest("post", "/api/v1/auth/login", body);
    const res = await raw.post("/api/v1/auth/login", body);
    check("post", "/api/v1/auth/login", 200, res.data);

    const me = await raw.get("/api/v1/auth/me");
    check("get", "/api/v1/auth/me", 200, me.data);

    const out = await raw.post("/api/v1/auth/logout", {});
    check("post", "/api/v1/auth/logout", 200, out.data);

    const gone = await raw.get("/api/v1/auth/me");
    expect(gone.status).toBe(401);
    check("get", "/api/v1/auth/me", 401, gone.data);

    const wrong = await raw.post("/api/v1/auth/login", {
      email: ADMIN_EMAIL,
      password: "salah-salah-123",
    });
    expect(wrong.status).toBe(401);
    check("post", "/api/v1/auth/login", 401, wrong.data);
  });

  it("login dibatasi 5/60 dtk → 429", async () => {
    for (let i = 0; i < 5; i++) {
      await raw.post("/api/v1/auth/login", { email: ADMIN_EMAIL, password: MOCK_PASSWORD });
    }
    const limited = await raw.post("/api/v1/auth/login", {
      email: ADMIN_EMAIL,
      password: MOCK_PASSWORD,
    });
    expect(limited.status).toBe(429);
    check("post", "/api/v1/auth/login", 429, limited.data);
    expect(limited.headers["retry-after"]).toBeDefined();
  });
});

describe("kontrak mock: konten generik + media", () => {
  it("CRUD hero + status/arsip/unarsip/hapus + reorder", async () => {
    await login();
    const created = await raw.post("/api/v1/admin/hero", { title: "Hero Uji", status: "draft" });
    expect(created.status).toBe(200);
    check("post", "/api/v1/admin/hero", 200, created.data);
    const id = created.data.data.id;

    const listed = await raw.get("/api/v1/admin/hero", { params: { page: 1, limit: 10 } });
    check("get", "/api/v1/admin/hero", 200, listed.data);

    const updated = await raw.patch(`/api/v1/admin/hero/${id}`, { title: "Hero Uji 2" });
    check("patch", "/api/v1/admin/hero/{id}", 200, updated.data);

    const status = await raw.patch(`/api/v1/admin/hero/${id}/status`, { status: "published" });
    check("patch", "/api/v1/admin/hero/{id}/status", 200, status.data);

    const archived = await raw.patch(`/api/v1/admin/hero/${id}/archive`, {});
    check("patch", "/api/v1/admin/hero/{id}/archive", 200, archived.data);

    const hidden = await raw.get("/api/v1/admin/hero");
    expect((hidden.data.data as unknown[]).some((item) => (item as { id: number }).id === id)).toBe(
      false,
    );

    const unarchived = await raw.patch(`/api/v1/admin/hero/${id}/unarchive`, {});
    check("patch", "/api/v1/admin/hero/{id}/unarchive", 200, unarchived.data);

    const removed = await raw.delete(`/api/v1/admin/hero/${id}`);
    check("delete", "/api/v1/admin/hero/{id}", 200, removed.data);

    const gone = await raw.get(`/api/v1/admin/hero/${id}`);
    expect(gone.status).toBe(404);
    check("get", "/api/v1/admin/hero/{id}", 404, gone.data);
  });

  it("publish portofolio tanpa gambar → 422 dengan pesan asli (FE-C05)", async () => {
    await login();
    const res = await raw.post("/api/v1/admin/portfolios", {
      title: "Tanpa Gambar",
      status: "published",
    });
    expect(res.status).toBe(422);
    check("post", "/api/v1/admin/portfolios", 422, res.data);
    expect(res.data.message).toContain("gambar");
  });

  it("guard: 401 anonim, 403 tanpa CSRF", async () => {
    const anon = await raw.get("/api/v1/admin/hero");
    expect(anon.status).toBe(401);
    check("get", "/api/v1/admin/hero", 401, anon.data);

    await login();
    const noCsrf = axios.create({ baseURL: "http://localhost", validateStatus: () => true });
    const res = await noCsrf.post("/api/v1/admin/hero", { title: "x" });
    expect(res.status).toBe(403);
    check("post", "/api/v1/admin/hero", 403, res.data);
  });

  it("media: list, upload, arsip, retry, hapus", async () => {
    await login();
    const listed = await raw.get("/api/v1/admin/media", { params: { limit: 24 } });
    check("get", "/api/v1/admin/media", 200, listed.data);

    const form = new FormData();
    form.append("file", new File(["fake-image"], "foto.jpg", { type: "image/jpeg" }));
    form.append("usage", "portfolio");
    const uploaded = await raw.post("/api/v1/admin/media", form);
    expect(uploaded.status).toBe(200);
    check("post", "/api/v1/admin/media", 200, uploaded.data);
    const mid = uploaded.data.data.id as number;

    const archived = await raw.patch(`/api/v1/admin/media/${mid}/archive`, {});
    check("patch", "/api/v1/admin/media/{id}/archive", 200, archived.data);

    const unarchived = await raw.patch(`/api/v1/admin/media/${mid}/unarchive`, {});
    check("patch", "/api/v1/admin/media/{id}/unarchive", 200, unarchived.data);

    const retried = await raw.post(`/api/v1/admin/media/${mid}/retry`, {});
    check("post", "/api/v1/admin/media/{id}/retry", 200, retried.data);

    const removed = await raw.delete(`/api/v1/admin/media/${mid}`);
    check("delete", "/api/v1/admin/media/{id}", 200, removed.data);
  });
});

describe("kontrak mock: leads + notifikasi", () => {
  it("inquiries & whatsapp: list, update, arsip", async () => {
    await login();
    for (const base of ["/api/v1/admin/inquiries", "/api/v1/admin/whatsapp-leads"] as const) {
      const listed = await raw.get(base, { params: { page: 1, limit: 10 } });
      expect(listed.status).toBe(200);
      check("get", base, 200, listed.data);

      const first = listed.data.data[0] as { id: number };
      const updated = await raw.patch(`${base}/${first.id}`, { status: "contacted" });
      expect(updated.status).toBe(200);
      check("patch", `${base}/{id}`, 200, updated.data);

      const bad = await raw.patch(`${base}/${first.id}`, { status: "salah" });
      expect(bad.status).toBe(400);
    }
  });

  it("notifikasi: list, unread, read, read-all, stream SSE", async () => {
    await login();
    const listed = await raw.get("/api/v1/admin/notifications");
    check("get", "/api/v1/admin/notifications", 200, listed.data);
    const unread = await raw.get("/api/v1/admin/notifications/unread-count");
    check("get", "/api/v1/admin/notifications/unread-count", 200, unread.data);
    expect(unread.data.data.unread_count).toBeGreaterThan(0);

    const first = listed.data.data.find((item: { read: boolean }) => !item.read) as { id: number };
    const read = await raw.post(`/api/v1/admin/notifications/${first.id}/read`, {});
    check("post", "/api/v1/admin/notifications/{id}/read", 200, read.data);

    const all = await raw.post("/api/v1/admin/notifications/read-all", {});
    check("post", "/api/v1/admin/notifications/read-all", 200, all.data);

    const stream = await raw.get("/api/v1/admin/notifications/stream");
    expect(stream.status).toBe(200);
    expect(String(stream.headers["content-type"])).toContain("text/event-stream");
  });
});

describe("kontrak mock: email", () => {
  it("akun: oauth-url, smtp create/update/reconnect/disable/hapus + 422 bila dipakai", async () => {
    await login();
    const listed = await raw.get("/api/v1/admin/email-accounts");
    check("get", "/api/v1/admin/email-accounts", 200, listed.data);

    const oauth = await raw.post("/api/v1/admin/email-accounts/google/oauth-url", {
      email_hint: "a@gmail.com",
    });
    check("post", "/api/v1/admin/email-accounts/google/oauth-url", 200, oauth.data);

    // Callback OAuth: 302 ke admin dengan query connected/status/reason (tanpa konten JSON).
    const oauthBad = await raw.get("/api/v1/oauth/google/email/callback", {
      params: { state: "salah" },
      maxRedirects: 0,
    });
    expect(oauthBad.status).toBe(302);
    expect(String(oauthBad.headers.location)).toContain("connected=false");

    const oauthOk = await raw.get("/api/v1/oauth/google/email/callback", {
      params: { state: "mock-state" },
      maxRedirects: 0,
    });
    expect(oauthOk.status).toBe(302);
    expect(String(oauthOk.headers.location)).toContain("connected=true");

    const smtpBody = {
      email_address: "info@example.com",
      display_name: "Info",
      smtp_host: "smtp.hostinger.com",
      smtp_port: 465,
      smtp_security: "ssl_tls",
      smtp_username: "info@example.com",
      smtp_password: "rahasia123",
    };
    checkRequest("post", "/api/v1/admin/email-accounts/smtp", smtpBody);
    const created = await raw.post("/api/v1/admin/email-accounts/smtp", smtpBody);
    check("post", "/api/v1/admin/email-accounts/smtp", 200, created.data);
    const aid = created.data.data.id as number;

    const updated = await raw.patch(`/api/v1/admin/email-accounts/${aid}`, {
      display_name: "Info Baru",
    });
    check("patch", "/api/v1/admin/email-accounts/{id}", 200, updated.data);

    const reconnected = await raw.post(`/api/v1/admin/email-accounts/${aid}/reconnect`, {});
    check("post", "/api/v1/admin/email-accounts/{id}/reconnect", 200, reconnected.data);

    const disabled = await raw.post(`/api/v1/admin/email-accounts/${aid}/disable`, {});
    check("post", "/api/v1/admin/email-accounts/{id}/disable", 200, disabled.data);

    const removed = await raw.delete(`/api/v1/admin/email-accounts/${aid}`);
    check("delete", "/api/v1/admin/email-accounts/{id}", 200, removed.data);

    // Akun seed id 1 dipakai kampanye → 422 dengan pesan asli.
    const used = await raw.delete("/api/v1/admin/email-accounts/1");
    expect(used.status).toBe(422);
    check("delete", "/api/v1/admin/email-accounts/{id}", 422, used.data);
  });

  it("template: create/update/hapus", async () => {
    await login();
    const listed = await raw.get("/api/v1/admin/email-templates");
    check("get", "/api/v1/admin/email-templates", 200, listed.data);

    const body = {
      name: "T Uji",
      subject: "S Uji",
      content_mode: "text",
      body_text: "Halo {{nama}}",
    };
    checkRequest("post", "/api/v1/admin/email-templates", body);
    const created = await raw.post("/api/v1/admin/email-templates", body);
    check("post", "/api/v1/admin/email-templates", 200, created.data);
    const tid = created.data.data.id as number;

    const updated = await raw.patch(`/api/v1/admin/email-templates/${tid}`, { subject: "S Uji 2" });
    check("patch", "/api/v1/admin/email-templates/{id}", 200, updated.data);

    const removed = await raw.delete(`/api/v1/admin/email-templates/${tid}`);
    check("delete", "/api/v1/admin/email-templates/{id}", 200, removed.data);
  });

  it("kampanye: draft, kirim, resend, penerima, log + permission", async () => {
    await login();
    const listed = await raw.get("/api/v1/admin/email-campaigns");
    check("get", "/api/v1/admin/email-campaigns", 200, listed.data);

    const draftBody = {
      title: "Uji",
      email_account_id: 1,
      subject: "Halo {{nama}}",
      body_text: "Halo {{nama}}",
      recipients: [{ email: "a@example.com", name: "A", variables: { nama: "A" } }],
    };
    checkRequest("post", "/api/v1/admin/email-campaigns/draft", draftBody);
    const draft = await raw.post("/api/v1/admin/email-campaigns/draft", draftBody);
    check("post", "/api/v1/admin/email-campaigns/draft", 200, draft.data);
    const did = draft.data.data.id as number;

    const badDraft = await raw.post("/api/v1/admin/email-campaigns/draft", {
      ...draftBody,
      recipients: [],
    });
    expect(badDraft.status).toBe(422);
    check("post", "/api/v1/admin/email-campaigns/draft", 422, badDraft.data);

    const sent = await raw.post(`/api/v1/admin/email-campaigns/${did}/send`, {});
    check("post", "/api/v1/admin/email-campaigns/{id}/send", 200, sent.data);

    // Kampanye gagal seed (id 5, failed_count 3) bisa dikirim ulang.
    const resent = await raw.post("/api/v1/admin/email-campaigns/5/resend-failed", {});
    check("post", "/api/v1/admin/email-campaigns/{id}/resend-failed", 200, resent.data);

    const recipients = await raw.get("/api/v1/admin/email-campaigns/1/recipients");
    check("get", "/api/v1/admin/email-campaigns/{id}/recipients", 200, recipients.data);

    const logs = await raw.get("/api/v1/admin/email-campaigns/1/logs");
    check("get", "/api/v1/admin/email-campaigns/{id}/logs", 200, logs.data);

    // Editor tanpa `email_campaign_logs.read` → 403.
    await raw.post("/api/v1/auth/logout", {});
    await login(EDITOR_EMAIL);
    const forbidden = await raw.get("/api/v1/admin/email-campaigns/1/logs");
    expect(forbidden.status).toBe(403);
    check("get", "/api/v1/admin/email-campaigns/{id}/logs", 403, forbidden.data);
  });
});

describe("kontrak mock: users, dashboard, settings, lain-lain", () => {
  it("users: list, create, update, status, hapus + aturan", async () => {
    await login();
    const listed = await raw.get("/api/v1/admin/users", { params: { search: "admin" } });
    check("get", "/api/v1/admin/users", 200, listed.data);

    const createBody = {
      name: "Baru",
      email: "baru@example.com",
      role: "content_editor",
      temporary_password: "sementara123",
    };
    checkRequest("post", "/api/v1/admin/users", createBody);
    const created = await raw.post("/api/v1/admin/users", createBody);
    check("post", "/api/v1/admin/users", 200, created.data);
    const uid = created.data.data.id as number;

    const duplicate = await raw.post("/api/v1/admin/users", createBody);
    expect(duplicate.status).toBe(409);
    check("post", "/api/v1/admin/users", 409, duplicate.data);

    const updated = await raw.patch(`/api/v1/admin/users/${uid}`, { name: "Baru 2" });
    check("patch", "/api/v1/admin/users/{id}", 200, updated.data);

    const status = await raw.patch(`/api/v1/admin/users/${uid}/status`, { status: "inactive" });
    check("patch", "/api/v1/admin/users/{id}/status", 200, status.data);

    // Tidak bisa menonaktifkan diri sendiri.
    const self = await raw.patch("/api/v1/admin/users/1/status", { status: "inactive" });
    expect(self.status).toBe(403);
    check("patch", "/api/v1/admin/users/{id}/status", 403, self.data);

    const removed = await raw.delete(`/api/v1/admin/users/${uid}`);
    check("delete", "/api/v1/admin/users/{id}", 200, removed.data);
  });

  it("dashboard, settings, health, audience, internal", async () => {
    await login();
    const dashboard = await raw.get("/api/v1/admin/dashboard");
    check("get", "/api/v1/admin/dashboard", 200, dashboard.data);

    const settings = await raw.get("/api/v1/admin/site-settings");
    check("get", "/api/v1/admin/site-settings", 200, settings.data);

    const patchBody = { brand: "Indobraga", show_brand_text: false };
    checkRequest("patch", "/api/v1/admin/site-settings", patchBody);
    const patched = await raw.patch("/api/v1/admin/site-settings", patchBody);
    check("patch", "/api/v1/admin/site-settings", 200, patched.data);

    const health = await raw.get("/api/v1/health");
    check("get", "/api/v1/health", 200, health.data);

    const contacts = await raw.get("/api/v1/admin/audience/contacts");
    check("get", "/api/v1/admin/audience/contacts", 200, contacts.data);

    const preview = await raw.get("/api/v1/admin/audience/preview");
    check("get", "/api/v1/admin/audience/preview", 200, preview.data);

    const csv = await raw.get("/api/v1/admin/audience/export.csv");
    expect(csv.status).toBe(200);
    expect(String(csv.headers["content-type"])).toContain("text/csv");

    for (const path of [
      "/api/v1/internal/workers/email-campaigns/tick",
      "/api/v1/internal/workers/notifications/tick",
      "/api/v1/internal/revalidation/tick",
    ]) {
      const tick = await raw.post(path, {});
      expect(tick.status).toBe(200);
    }
  });

  it("injeksi error 500 → envelope INTERNAL_ERROR (simulasi 5xx)", async () => {
    const { failNextRequest } = await import("@/mocks/server");
    failNextRequest({ status: 500, code: "INTERNAL_ERROR", message: "Simulasi gagal." });
    const res = await raw.get("/api/v1/public/site-settings");
    expect(res.status).toBe(500);
    // Simulasi 5xx di luar respons terdokumentasi — yang dijamin bentuk envelope-nya.
    assertErrorEnvelope(res.data);
    expect(res.data.code).toBe("INTERNAL_ERROR");
  });
});
