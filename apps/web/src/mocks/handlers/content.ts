import { http } from "msw";
import { db, CONTENT_RESOURCES } from "@/mocks/db";
import { commonErrors, fail, ok } from "@/mocks/respond";
import { clampLimit, offsetPaginate, parsePage, requireAdmin } from "@/mocks/guard";

const VALID_STATUSES = new Set(["draft", "published", "inactive", "archived"]);
const WRITABLE_STATUSES = new Set(["draft", "published", "inactive"]);

function findItem(resource: string, id: number) {
  return db.state.content[resource]?.find((item) => item.id === id) ?? null;
}

function hasImages(item: Record<string, unknown>): boolean {
  const images = item.images;
  if (Array.isArray(images) && images.length > 0) return true;
  const cover = item.cover_image;
  if (cover && typeof cover === "object") return true;
  const mediaIds = item.media_file_ids;
  if (Array.isArray(mediaIds) && mediaIds.length > 0) return true;
  return false;
}

function contentHandlersFor(resource: string) {
  const base = `*/api/v1/admin/${resource}`;
  return [
    http.get(base, ({ request }) => {
      const session = requireAdmin(request);
      if (session instanceof Response) return session;
      const url = new URL(request.url);
      const page = parsePage(url.searchParams.get("page"));
      const limit = clampLimit(url.searchParams.get("limit"), 10, 100);
      const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
      const status = url.searchParams.get("status");
      let items = [...(db.state.content[resource] ?? [])];
      if (status) {
        if (!VALID_STATUSES.has(status)) {
          return commonErrors.validation([{ field: "status", message: "Status tidak valid." }]);
        }
        items = items.filter((item) => item.status === status);
      } else {
        // Arsip disembunyikan kecuali diminta (paritas kontrak).
        items = items.filter((item) => item.status !== "archived");
      }
      if (q) {
        items = items.filter((item) => JSON.stringify(item).toLowerCase().includes(q));
      }
      const { items: sliced, meta } = offsetPaginate(items, page, limit);
      return ok(sliced, { meta });
    }),

    http.post(base, async ({ request }) => {
      const session = requireAdmin(request);
      if (session instanceof Response) return session;
      const body = (await request.json()) as Record<string, unknown>;
      const status = typeof body.status === "string" ? body.status : "draft";
      if (!WRITABLE_STATUSES.has(status)) {
        return commonErrors.validation([{ field: "status", message: "Status tidak valid." }]);
      }
      if (resource === "portfolios" && status === "published" && !hasImages(body)) {
        return fail(
          422,
          "UNPROCESSABLE_ENTITY",
          "Portofolio membutuhkan minimal 1 gambar untuk ditayangkan.",
          [
            {
              field: "media_file_ids",
              message: "Portofolio membutuhkan minimal 1 gambar untuk ditayangkan.",
            },
          ],
        );
      }
      const item: Record<string, unknown> = {
        ...body,
        id: db.takeId(),
        status,
        previous_status: null,
        archived_at: null,
        created_at: db.now(),
        updated_at: db.now(),
      };
      db.state.content[resource].unshift(item);
      return ok(item, { message: "Data berhasil ditambahkan." });
    }),

    http.get(`${base}/:id`, ({ request, params }) => {
      const session = requireAdmin(request);
      if (session instanceof Response) return session;
      const item = findItem(resource, Number(params.id));
      if (!item) return commonErrors.notFound();
      return ok(item);
    }),

    http.patch(`${base}/:id`, async ({ request, params }) => {
      const session = requireAdmin(request);
      if (session instanceof Response) return session;
      const item = findItem(resource, Number(params.id));
      if (!item) return commonErrors.notFound();
      const body = (await request.json()) as Record<string, unknown>;
      if (body.status !== undefined && !WRITABLE_STATUSES.has(String(body.status))) {
        return commonErrors.validation([{ field: "status", message: "Status tidak valid." }]);
      }
      const next: Record<string, unknown> = { ...item, ...body, id: item.id, updated_at: db.now() };
      if (resource === "portfolios" && next.status === "published" && !hasImages(next)) {
        return fail(
          422,
          "UNPROCESSABLE_ENTITY",
          "Portofolio membutuhkan minimal 1 gambar untuk ditayangkan.",
          [
            {
              field: "media_file_ids",
              message: "Portofolio membutuhkan minimal 1 gambar untuk ditayangkan.",
            },
          ],
        );
      }
      Object.assign(item, next);
      return ok(item, { message: "Data berhasil diperbarui." });
    }),

    http.patch(`${base}/:id/status`, async ({ request, params }) => {
      const session = requireAdmin(request);
      if (session instanceof Response) return session;
      const item = findItem(resource, Number(params.id));
      if (!item) return commonErrors.notFound();
      const body = (await request.json()) as { status?: unknown };
      const status = String(body.status ?? "");
      if (!WRITABLE_STATUSES.has(status)) {
        return commonErrors.validation([{ field: "status", message: "Status tidak valid." }]);
      }
      if (resource === "portfolios" && status === "published" && !hasImages(item)) {
        return fail(
          422,
          "UNPROCESSABLE_ENTITY",
          "Portofolio membutuhkan minimal 1 gambar untuk ditayangkan.",
          [
            {
              field: "status",
              message: "Portofolio membutuhkan minimal 1 gambar untuk ditayangkan.",
            },
          ],
        );
      }
      item.previous_status = item.status;
      item.status = status;
      item.updated_at = db.now();
      return ok(item, { message: "Status berhasil diperbarui." });
    }),

    http.patch(`${base}/:id/archive`, ({ request, params }) => {
      const session = requireAdmin(request);
      if (session instanceof Response) return session;
      const item = findItem(resource, Number(params.id));
      if (!item) return commonErrors.notFound();
      item.previous_status = item.status;
      item.status = "archived";
      item.archived_at = db.now();
      item.updated_at = db.now();
      return ok(item, { message: "Data diarsipkan." });
    }),

    http.patch(`${base}/:id/unarchive`, ({ request, params }) => {
      const session = requireAdmin(request);
      if (session instanceof Response) return session;
      const item = findItem(resource, Number(params.id));
      if (!item) return commonErrors.notFound();
      const previous = typeof item.previous_status === "string" ? item.previous_status : "draft";
      item.status = WRITABLE_STATUSES.has(previous) ? previous : "draft";
      item.previous_status = "archived";
      item.archived_at = null;
      item.updated_at = db.now();
      return ok(item, { message: "Data dikeluarkan dari arsip." });
    }),

    http.delete(`${base}/:id`, ({ request, params }) => {
      const session = requireAdmin(request);
      if (session instanceof Response) return session;
      const collection = db.state.content[resource] ?? [];
      const index = collection.findIndex((item) => item.id === Number(params.id));
      if (index < 0) return commonErrors.notFound();
      collection.splice(index, 1);
      return ok(
        { id: Number(params.id), status: "permanently_deleted", cleanup_failed_media_count: 0 },
        { message: "Data dihapus permanen." },
      );
    }),
  ];
}

/** Reorder generik (kontrak: PATCH /admin/{resource}/reorder). */
function reorderHandler(resource: string) {
  return http.patch(`*/api/v1/admin/${resource}/reorder`, async ({ request }) => {
    const session = requireAdmin(request);
    if (session instanceof Response) return session;
    const body = (await request.json()) as { items?: { id: number; sort_order: number }[] };
    const collection = db.state.content[resource] ?? [];
    for (const entry of body.items ?? []) {
      const item = collection.find((candidate) => candidate.id === entry.id);
      if (item) item.sort_order = entry.sort_order;
    }
    return ok({ updated: (body.items ?? []).length }, { message: "Urutan berhasil diperbarui." });
  });
}

const REORDER_RESOURCES = [
  "hero-slides",
  "partners",
  "production-strengths",
  "services",
  "machines",
  "printing-capacities",
  "production-capacities",
  "portfolio-categories",
  "portfolios",
  "gallery-items",
];

export const contentHandlers = [
  ...CONTENT_RESOURCES.flatMap((resource) => contentHandlersFor(resource)),
  ...REORDER_RESOURCES.map((resource) => reorderHandler(resource)),
];
