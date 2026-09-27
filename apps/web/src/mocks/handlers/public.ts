import { http, HttpResponse } from "msw";
import { db, getSeed, publicSiteSettings } from "@/mocks/db";
import { commonErrors, ok } from "@/mocks/respond";
import {
  checkLeadRateLimit,
  clampLimit,
  consumeTestFailure,
  offsetMeta,
  parsePage,
} from "@/mocks/guard";
import { buildWhatsAppUrl, normalizePhoneId } from "@/modules/leads/lib/lead-contact";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface CursorPage {
  items: Record<string, unknown>[];
  next_cursor: string | null;
  has_more: boolean;
  limit: number;
}

function cursorSeed(name: string): CursorPage {
  const envelope = getSeed(name);
  const data = envelope && Array.isArray(envelope.data) ? envelope.data : [];
  const meta = (envelope?.meta ?? {}) as {
    limit?: number;
    next_cursor?: string | null;
    has_more?: boolean;
  };
  return {
    items: data as Record<string, unknown>[],
    next_cursor: meta.next_cursor ?? null,
    has_more: meta.has_more ?? false,
    limit: meta.limit ?? 8,
  };
}

function matchCategory(
  item: Record<string, unknown>,
  category?: string | null,
  categorySlug?: string | null,
) {
  if (!category && !categorySlug) return true;
  const name = item.category as string | null;
  const slug = item.category_slug as string | null;
  return (
    (category && (name === category || slug === category)) ||
    (categorySlug && (name === categorySlug || slug === categorySlug))
  );
}

export const publicHandlers = [
  http.get("*/api/v1/public/site-settings", () => {
    const failure = consumeTestFailure();
    if (failure) return failure;
    return ok(publicSiteSettings());
  }),

  http.get("*/api/v1/public/home", () => {
    const failure = consumeTestFailure();
    if (failure) return failure;
    return ok(getSeed("GET-api-v1-public-home.json")?.data ?? null);
  }),

  http.get("*/api/v1/public/facilities", () => {
    const failure = consumeTestFailure();
    if (failure) return failure;
    return ok(getSeed("GET-api-v1-public-facilities.json")?.data ?? null);
  }),

  http.get("*/api/v1/public/portfolio", ({ request }) => {
    const failure = consumeTestFailure();
    if (failure) return failure;
    const url = new URL(request.url);
    const limit = clampLimit(url.searchParams.get("limit"), 8, 24);
    const cursor = url.searchParams.get("cursor");
    const category = url.searchParams.get("category");
    const categorySlug = url.searchParams.get("category_slug");
    if (cursor && cursor.length > 512) {
      return commonErrors.validation([{ field: "cursor", message: "Kursor tidak valid." }]);
    }
    const page1 = cursorSeed("GET-api-v1-public-portfolio.json");
    const page2 = cursorSeed("GET-api-v1-public-portfolio-cursor2.json");
    if (category || categorySlug) {
      const filtered = [...page1.items, ...page2.items].filter((item) =>
        matchCategory(item, category, categorySlug),
      );
      const items = filtered.slice(0, limit);
      return ok(items, {
        meta: { limit, next_cursor: null, has_more: filtered.length > items.length },
      });
    }
    if (cursor) {
      return ok(page2.items.slice(0, limit), {
        meta: { limit, next_cursor: null, has_more: false },
      });
    }
    return ok(page1.items.slice(0, limit), {
      meta: { limit, next_cursor: page1.next_cursor, has_more: page1.has_more },
    });
  }),

  http.get("*/api/v1/public/portfolio-categories", () => {
    const failure = consumeTestFailure();
    if (failure) return failure;
    const seed = getSeed("GET-api-v1-public-portfolio-categories.json")?.data;
    const items = Array.isArray(seed) ? seed : ((seed as { items?: unknown[] })?.items ?? []);
    return ok({ items });
  }),

  http.get("*/api/v1/public/gallery", ({ request }) => {
    const failure = consumeTestFailure();
    if (failure) return failure;
    const url = new URL(request.url);
    const limit = clampLimit(url.searchParams.get("limit"), 8, 24);
    const type = url.searchParams.get("type");
    const cursor = url.searchParams.get("cursor");
    if (type && type !== "image" && type !== "video") {
      return commonErrors.validation([{ field: "type", message: "Tipe media tidak valid." }]);
    }
    const page = cursorSeed("GET-api-v1-public-gallery.json");
    const items = page.items.filter((item) => !type || item.type === type);
    if (cursor) {
      return ok([], { meta: { limit, next_cursor: null, has_more: false } });
    }
    const sliced = items.slice(0, limit);
    return ok(sliced, {
      meta: {
        limit,
        next_cursor: items.length > sliced.length ? "mock-cursor-page2" : null,
        has_more: items.length > sliced.length,
      },
    });
  }),

  http.get("*/api/v1/public/news", ({ request }) => {
    const failure = consumeTestFailure();
    if (failure) return failure;
    const url = new URL(request.url);
    const page = parsePage(url.searchParams.get("page"));
    const limit = clampLimit(url.searchParams.get("limit"), 6, 50);
    const page1 = getSeed("GET-api-v1-public-news.json");
    const page2 = getSeed("GET-api-v1-public-news-page2.json");
    const total = (page1?.meta as { total?: number } | undefined)?.total ?? 0;
    const items = page === 1 ? page1?.data : page === 2 ? page2?.data : [];
    return ok(items ?? [], { meta: offsetMeta(page, limit, total) });
  }),

  http.get("*/api/v1/public/news/:slug", ({ params }) => {
    const failure = consumeTestFailure();
    if (failure) return failure;
    const slug = String(params.slug ?? "");
    const envelope = getSeed("GET-api-v1-public-news-slug.json");
    const detail = envelope?.data as Record<string, unknown> | null;
    if (detail && detail.slug === slug) return ok(detail);
    return commonErrors.notFound("Konten tidak ditemukan.");
  }),

  http.get("*/api/v1/public/seo", () => {
    const failure = consumeTestFailure();
    if (failure) return failure;
    // SeoByPath: turunkan dari seed SeoLegacy (bentuk respons beda endpoint).
    const seed = getSeed("GET-api-v1-public-seo-home.json")?.data as {
      title: string;
      description: string;
      canonical_url: string;
      noindex?: boolean;
    } | null;
    if (!seed) return commonErrors.notFound("Konten tidak ditemukan.");
    return ok({
      title: seed.title,
      description: seed.description,
      canonical_url: seed.canonical_url,
      robots: seed.noindex === true ? "noindex, nofollow" : "index, follow",
      status: 200,
    });
  }),

  http.get("*/api/v1/public/seo/:route", ({ params }) => {
    const failure = consumeTestFailure();
    if (failure) return failure;
    const route = String(params.route ?? "");
    const file: Record<string, string> = {
      home: "GET-api-v1-public-seo-home.json",
      portfolio: "GET-api-v1-public-seo-portfolio.json",
      fasilitas: "GET-api-v1-public-seo-fasilitas.json",
      galeri: "GET-api-v1-public-seo-galeri.json",
      kontak: "GET-api-v1-public-seo-kontak.json",
      berita: "GET-api-v1-public-seo-berita.json",
      "berita-kapasitas-produksi-90000-pcs":
        "GET-api-v1-public-seo-berita-kapasitas-produksi-90000-pcs.json",
    };
    const envelope = file[route] ? getSeed(file[route]) : undefined;
    if (!envelope) return commonErrors.notFound("Konten tidak ditemukan.");
    return ok(envelope.data);
  }),

  http.post("*/api/v1/public/inquiries", async ({ request }) => {
    const failure = consumeTestFailure();
    if (failure) return failure;
    const limited = checkLeadRateLimit();
    if (limited) return limited;
    const body = (await request.json()) as Record<string, unknown>;
    // Honeypot: bot ter-drop diam-diam dengan respons sukses.
    if (typeof body.website === "string" && body.website.trim() !== "") {
      return ok({ id: 0 }, { message: "Pesan berhasil dikirim." });
    }
    const errors: { field: string | null; message: string }[] = [];
    if (typeof body.name !== "string" || body.name.trim().length < 2) {
      errors.push({ field: "name", message: "Nama minimal 2 karakter." });
    }
    if (typeof body.email !== "string" || !EMAIL_PATTERN.test(body.email)) {
      errors.push({ field: "email", message: "Format email tidak valid." });
    }
    if (typeof body.phone !== "string" || !/^[0-9+()\-\s]{7,30}$/.test(body.phone)) {
      errors.push({ field: "phone", message: "Format nomor telepon tidak valid." });
    }
    if (typeof body.message !== "string" || body.message.trim().length < 10) {
      errors.push({ field: "message", message: "Pesan minimal 10 karakter." });
    }
    if (errors.length > 0) return commonErrors.validation(errors);
    const id = db.takeId();
    db.state.inquiries.unshift({
      id,
      name: (body.name as string).trim(),
      email: (body.email as string).trim(),
      phone: (body.phone as string).trim(),
      company: typeof body.company === "string" ? body.company.trim() : null,
      message: (body.message as string).trim(),
      status: "new",
      internal_note: null,
      source: "website",
      created_at: db.now(),
      updated_at: db.now(),
    });
    return ok({ id, status: "new" }, { message: "Pesan berhasil dikirim." });
  }),

  http.post("*/api/v1/public/whatsapp-leads", async ({ request }) => {
    const failure = consumeTestFailure();
    if (failure) return failure;
    const limited = checkLeadRateLimit();
    if (limited) return limited;
    const body = (await request.json()) as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const errors: { field: string | null; message: string }[] = [];
    if (name.length < 2) errors.push({ field: "name", message: "Nama minimal 2 karakter." });
    if (!normalizePhoneId(phone))
      errors.push({ field: "phone", message: "Format nomor telepon tidak valid." });
    if (errors.length > 0) return commonErrors.validation(errors);
    const whatsappUrl =
      buildWhatsAppUrl(phone, typeof body.message === "string" ? body.message : undefined) ??
      `https://wa.me/${normalizePhoneId(phone)}`;
    const generatedMessage = typeof body.message === "string" ? body.message : "";
    const id = db.takeId();
    db.state.whatsappLeads.unshift({
      id,
      name,
      phone,
      message: typeof body.message === "string" ? body.message : null,
      generated_message: generatedMessage,
      whatsapp_url: whatsappUrl,
      status: "new",
      internal_note: null,
      source: "website",
      created_at: db.now(),
      updated_at: db.now(),
    });
    return ok(
      { id, status: "new", whatsapp_url: whatsappUrl, generated_message: generatedMessage },
      { message: "Prospek WhatsApp tersimpan." },
    );
  }),

  http.get("*/robots.txt", () => {
    return HttpResponse.text(
      "User-agent: *\nDisallow: /admin\nDisallow: /login\nDisallow: /api/\nDisallow: /internal/\nSitemap: https://indobraga.com/sitemap.xml\n",
      {
        headers: { "Content-Type": "text/plain" },
      },
    );
  }),

  http.get("*/sitemap.xml", () => {
    return HttpResponse.text(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://indobraga.com/</loc></url></urlset>`,
      {
        headers: { "Content-Type": "application/xml" },
      },
    );
  }),
];
