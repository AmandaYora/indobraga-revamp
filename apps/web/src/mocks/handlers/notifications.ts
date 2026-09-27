import { http, HttpResponse } from "msw";
import { db } from "@/mocks/db";
import { commonErrors, ok } from "@/mocks/respond";
import { clampLimit, offsetPaginate, parsePage, requireAdmin } from "@/mocks/guard";

export const notificationsHandlers = [
  http.get("*/api/v1/admin/notifications", ({ request }) => {
    const session = requireAdmin(request);
    if (session instanceof Response) return session;
    const url = new URL(request.url);
    const page = parsePage(url.searchParams.get("page"));
    const limit = clampLimit(url.searchParams.get("limit"), 10, 100);
    const read = url.searchParams.get("read");
    let items = [...db.state.notifications];
    if (read === "unread") items = items.filter((item) => item.read === false);
    if (read === "read") items = items.filter((item) => item.read === true);
    const { items: sliced, meta } = offsetPaginate(items, page, limit);
    return ok(sliced, { meta });
  }),

  http.get("*/api/v1/admin/notifications/unread-count", ({ request }) => {
    const session = requireAdmin(request);
    if (session instanceof Response) return session;
    const unread = db.state.notifications.filter((item) => item.read === false).length;
    return ok({ unread_count: unread });
  }),

  // SSE: respons stream teks; EventSource browser memakai endpoint ini.
  // Test mem-mock `EventSource` (MSW 2 tidak menyediakan server SSE stateful).
  http.get("*/api/v1/admin/notifications/stream", ({ request }) => {
    const session = requireAdmin(request);
    if (session instanceof Response) return session;
    const payload =
      `retry: 10000\n` +
      `event: notification.created\n` +
      `data: {"id":1,"title":"Pesan kontak baru"}\n\n`;
    return new HttpResponse(payload, {
      status: 200,
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  }),

  http.post("*/api/v1/admin/notifications/read-all", ({ request }) => {
    const session = requireAdmin(request);
    if (session instanceof Response) return session;
    let updated = 0;
    for (const item of db.state.notifications) {
      if (item.read === false) {
        item.read = true;
        updated += 1;
      }
    }
    return ok(
      { marked_read: updated, unread_count: 0 },
      { message: "Semua notifikasi ditandai dibaca." },
    );
  }),

  http.post("*/api/v1/admin/notifications/:id/read", ({ request, params }) => {
    const session = requireAdmin(request);
    if (session instanceof Response) return session;
    const item = db.state.notifications.find((entry) => entry.id === Number(params.id));
    if (!item) return commonErrors.notFound();
    item.read = true;
    const unread = db.state.notifications.filter((entry) => entry.read === false).length;
    return ok({ unread_count: unread }, { message: "Notifikasi ditandai dibaca." });
  }),
];
