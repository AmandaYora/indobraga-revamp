import { http } from "msw";
import { db } from "@/mocks/db";
import { commonErrors, ok } from "@/mocks/respond";
import { clampLimit, offsetPaginate, parsePage, requireAdmin } from "@/mocks/guard";

const VALID_COMPRESSION = new Set([
  "processing",
  "completed",
  "failed",
  "archived",
  "pending_delete",
  "deleted",
  "cleanup_failed",
]);

const VALID_USAGES = new Set([
  "hero",
  "partner",
  "portfolio",
  "machine",
  "gallery",
  "news",
  "og",
  "other",
]);

export const mediaHandlers = [
  http.get("*/api/v1/admin/media", ({ request }) => {
    const session = requireAdmin(request);
    if (session instanceof Response) return session;
    const url = new URL(request.url);
    const page = parsePage(url.searchParams.get("page"));
    const limit = clampLimit(url.searchParams.get("limit"), 24, 100);
    const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
    const mediaType = url.searchParams.get("media_type");
    const compression = url.searchParams.get("compression_status");
    let items = [...db.state.media];
    if (compression) {
      if (!VALID_COMPRESSION.has(compression)) {
        return commonErrors.validation([
          { field: "compression_status", message: "Status kompresi tidak valid." },
        ]);
      }
      items = items.filter((item) => item.compression_status === compression);
    } else {
      // Arsip disembunyikan kecuali diminta (paritas kontrak).
      items = items.filter((item) => item.compression_status !== "archived");
    }
    if (mediaType) items = items.filter((item) => item.media_type === mediaType);
    if (q) {
      items = items.filter((item) =>
        String(item.original_file_name ?? "")
          .toLowerCase()
          .includes(q),
      );
    }
    const { items: sliced, meta } = offsetPaginate(items, page, limit);
    return ok(sliced, { meta });
  }),

  http.post("*/api/v1/admin/media", async ({ request }) => {
    const session = requireAdmin(request);
    if (session instanceof Response) return session;
    const form = await request.formData();
    const file = form.get("file");
    const usage = String(form.get("usage") ?? "");
    if (!(file instanceof File)) {
      return commonErrors.validation([{ field: "file", message: "File wajib diunggah." }]);
    }
    if (!VALID_USAGES.has(usage)) {
      return commonErrors.validation([
        { field: "usage", message: "Penggunaan media tidak valid." },
      ]);
    }
    if (file.size > 10 * 1024 * 1024) {
      return commonErrors.validation([
        { field: "file", message: "File atau data yang dikirim terlalu besar." },
      ]);
    }
    const allowed = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"];
    if (file.type && !allowed.includes(file.type)) {
      return commonErrors.validation([{ field: "file", message: "Format file belum didukung." }]);
    }
    const id = db.takeId();
    const isVideo = file.type.startsWith("video/");
    // URL absolut sesuai kontrak (`format: uri`); origin mengikuti request.
    const origin = new URL(request.url).origin;
    const url = (path: string) => `${origin}${path}`;
    const item: Record<string, unknown> = {
      id,
      media_type: isVideo ? "video" : "image",
      mime_type: file.type || "application/octet-stream",
      original_file_name: file.name,
      compression_status: "completed",
      previous_status: null,
      file_url: url(`/mock-media/${id}/original`),
      thumbnail_url: isVideo ? null : url(`/mock-media/${id}/thumbnail`),
      medium_url: isVideo ? null : url(`/mock-media/${id}/medium`),
      large_url: isVideo ? null : url(`/mock-media/${id}/large`),
      poster_url: null,
      video_url: isVideo ? url(`/mock-media/${id}/video`) : null,
      width: 1600,
      height: 900,
      duration_seconds: null,
      original_size: file.size,
      optimized_size: file.size,
      error: null,
      archived_at: null,
      deleted_at: null,
      created_at: db.now(),
      updated_at: db.now(),
    };
    db.state.media.unshift(item);
    return ok(item, { message: "Media berhasil diunggah." });
  }),

  http.get("*/api/v1/admin/media/:id", ({ request, params }) => {
    const session = requireAdmin(request);
    if (session instanceof Response) return session;
    const item = db.state.media.find((entry) => entry.id === Number(params.id));
    if (!item) return commonErrors.notFound();
    return ok(item);
  }),

  http.patch("*/api/v1/admin/media/:id/archive", ({ request, params }) => {
    const session = requireAdmin(request);
    if (session instanceof Response) return session;
    const item = db.state.media.find((entry) => entry.id === Number(params.id));
    if (!item) return commonErrors.notFound();
    item.previous_status = item.compression_status;
    item.compression_status = "archived";
    item.archived_at = db.now();
    item.updated_at = db.now();
    return ok(item, { message: "Media diarsipkan." });
  }),

  http.patch("*/api/v1/admin/media/:id/unarchive", ({ request, params }) => {
    const session = requireAdmin(request);
    if (session instanceof Response) return session;
    const item = db.state.media.find((entry) => entry.id === Number(params.id));
    if (!item) return commonErrors.notFound();
    item.compression_status = item.previous_status === "failed" ? "failed" : "completed";
    item.archived_at = null;
    item.updated_at = db.now();
    return ok(item, { message: "Media dikeluarkan dari arsip." });
  }),

  http.post("*/api/v1/admin/media/:id/retry", ({ request, params }) => {
    const session = requireAdmin(request);
    if (session instanceof Response) return session;
    const item = db.state.media.find((entry) => entry.id === Number(params.id));
    if (!item) return commonErrors.notFound();
    item.compression_status = "processing";
    item.error = null;
    item.updated_at = db.now();
    return ok(item, { message: "Media dijadwalkan ulang." });
  }),

  http.delete("*/api/v1/admin/media/:id", ({ request, params }) => {
    const session = requireAdmin(request);
    if (session instanceof Response) return session;
    const index = db.state.media.findIndex((entry) => entry.id === Number(params.id));
    if (index < 0) return commonErrors.notFound();
    db.state.media.splice(index, 1);
    return ok(
      { id: Number(params.id), status: "permanently_deleted" },
      { message: "Media dihapus permanen." },
    );
  }),
];
