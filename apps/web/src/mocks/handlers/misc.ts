import { http, HttpResponse } from "msw";
import { db, getSeed } from "@/mocks/db";
import { ok } from "@/mocks/respond";
import { clampLimit, offsetPaginate, parsePage, requireAdmin } from "@/mocks/guard";

export const miscHandlers = [
  http.get("*/api/v1/health", () => {
    return ok(
      {
        status: "ok",
        service: "indobraga-api",
        uptime_seconds: 60,
        checks: {
          database: { status: "ok", latency_ms: 1 },
          storage: { status: "ok", latency_ms: 1 },
        },
      },
      { message: "Layanan berjalan baik." },
    );
  }),

  http.get("*/api/v1/admin/dashboard", ({ request }) => {
    const session = requireAdmin(request);
    if (session instanceof Response) return session;
    const inquiries = db.state.inquiries;
    const whatsappLeads = db.state.whatsappLeads;
    const publishedNews = db.state.content.news.filter(
      (item) => item.status === "published",
    ).length;
    const activePortfolios = db.state.content.portfolios.filter(
      (item) => item.status === "published",
    ).length;
    const completedMedia = db.state.media.filter(
      (item) => item.compression_status === "completed",
    ).length;
    const failedMedia = db.state.media.filter(
      (item) =>
        item.compression_status === "failed" || item.compression_status === "cleanup_failed",
    ).length;
    const connectedAccounts = db.state.emailAccounts.filter(
      (item) => item.status === "connected",
    ).length;
    const campaigns = db.state.campaigns;
    const pendingCampaigns = campaigns.filter(
      (item) => item.status === "pending" || item.status === "processing",
    ).length;
    return ok({
      totals: {
        inquiries: inquiries.length,
        whatsapp_leads: whatsappLeads.length,
        published_gallery: db.state.content["gallery-items"].filter(
          (item) => item.status === "published",
        ).length,
        published_news: publishedNews,
        active_portfolios: activePortfolios,
        completed_media: completedMedia,
        failed_media: failedMedia,
        connected_email_accounts: connectedAccounts,
        email_campaigns: campaigns.length,
        pending_email_campaigns: pendingCampaigns,
        // KONFLIK BC-12 vs kontrak (dilaporkan di PLAN-02): kontrak masih
        // mewajibkan `pending_revalidation`; mock mengikuti kontrak agar
        // validasi kontrak hijau. UI tidak pernah menampilkannya (BC-12).
        pending_revalidation: 0,
      },
      latest_inquiries: inquiries.slice(0, 5),
      latest_whatsapp_leads: whatsappLeads.slice(0, 5),
      latest_email_campaigns: campaigns.slice(0, 5),
    });
  }),

  http.get("*/api/v1/admin/site-settings", ({ request }) => {
    const session = requireAdmin(request);
    if (session instanceof Response) return session;
    return ok({ id: 1, ...db.state.siteSettingsAdmin });
  }),

  http.patch("*/api/v1/admin/site-settings", async ({ request }) => {
    const session = requireAdmin(request);
    if (session instanceof Response) return session;
    const body = (await request.json()) as Record<string, unknown>;
    Object.assign(db.state.siteSettingsAdmin, body, { updated_at: db.now() });
    return ok({ id: 1, ...db.state.siteSettingsAdmin }, { message: "Pengaturan disimpan." });
  }),

  // --- Audience (tidak punya UI di revamp ini, tetapi tercakup kontrak) ---
  http.get("*/api/v1/admin/audience/contacts", ({ request }) => {
    const session = requireAdmin(request);
    if (session instanceof Response) return session;
    const url = new URL(request.url);
    const page = parsePage(url.searchParams.get("page"));
    const limit = clampLimit(url.searchParams.get("limit"), 10, 100);
    const items = (getSeed("GET-api-v1-admin-audience-contacts.json")?.data ?? []) as unknown[];
    const { items: sliced, meta } = offsetPaginate(items, page, limit);
    return ok(sliced, { meta });
  }),

  http.get("*/api/v1/admin/audience/preview", ({ request }) => {
    const session = requireAdmin(request);
    if (session instanceof Response) return session;
    return ok(getSeed("GET-api-v1-admin-audience-preview.json")?.data ?? null);
  }),

  http.get("*/api/v1/admin/audience/export.csv", ({ request }) => {
    const session = requireAdmin(request);
    if (session instanceof Response) return session;
    return new HttpResponse("name,email,company\n", {
      status: 200,
      headers: { "Content-Type": "text/csv" },
    });
  }),

  // --- Internal worker (kontrak; bukan untuk UI) ---
  http.post("*/api/v1/internal/workers/email-campaigns/tick", () => {
    return ok({ processed: 0 }, { message: "Tick selesai." });
  }),

  http.post("*/api/v1/internal/workers/notifications/tick", () => {
    return ok({ processed: 0 }, { message: "Tick selesai." });
  }),

  http.post("*/api/v1/internal/revalidation/tick", () => {
    return ok({ processed: 0 }, { message: "Tick selesai." });
  }),
];
