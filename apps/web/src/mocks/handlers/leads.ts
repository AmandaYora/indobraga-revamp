import { http } from "msw";
import { db } from "@/mocks/db";
import { commonErrors, ok } from "@/mocks/respond";
import { clampLimit, offsetPaginate, parsePage, requireAdmin } from "@/mocks/guard";

const VALID_LEAD_STATUS = new Set(["new", "contacted", "in_progress", "closed", "spam"]);

function leadHandlersFor(kind: "inquiries" | "whatsappLeads", base: string) {
  const collection = () => (kind === "inquiries" ? db.state.inquiries : db.state.whatsappLeads);
  return [
    http.get(base, ({ request }) => {
      const session = requireAdmin(request);
      if (session instanceof Response) return session;
      const url = new URL(request.url);
      const page = parsePage(url.searchParams.get("page"));
      const limit = clampLimit(url.searchParams.get("limit"), 10, 100);
      const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
      const status = url.searchParams.get("status");
      let items = [...collection()];
      if (status) {
        if (!VALID_LEAD_STATUS.has(status)) {
          return commonErrors.validation([{ field: "status", message: "Status tidak valid." }]);
        }
        items = items.filter((item) => item.status === status);
      }
      if (q) {
        items = items.filter((item) => JSON.stringify(item).toLowerCase().includes(q));
      }
      const { items: sliced, meta } = offsetPaginate(items, page, limit);
      return ok(sliced, { meta });
    }),

    http.get(`${base}/:id`, ({ request, params }) => {
      const session = requireAdmin(request);
      if (session instanceof Response) return session;
      const item = collection().find((entry) => entry.id === Number(params.id));
      if (!item) return commonErrors.notFound();
      return ok(item);
    }),

    http.patch(`${base}/:id`, async ({ request, params }) => {
      const session = requireAdmin(request);
      if (session instanceof Response) return session;
      const item = collection().find((entry) => entry.id === Number(params.id));
      if (!item) return commonErrors.notFound();
      const body = (await request.json()) as { status?: unknown; internal_note?: unknown };
      if (body.status !== undefined && !VALID_LEAD_STATUS.has(String(body.status))) {
        return commonErrors.validation([{ field: "status", message: "Status tidak valid." }]);
      }
      if (body.status !== undefined) item.status = String(body.status);
      if (body.internal_note !== undefined) {
        item.internal_note = typeof body.internal_note === "string" ? body.internal_note : null;
      }
      item.updated_at = db.now();
      return ok(item, { message: "Prospek diperbarui." });
    }),

    http.delete(`${base}/:id`, ({ request, params }) => {
      const session = requireAdmin(request);
      if (session instanceof Response) return session;
      const items = collection();
      const index = items.findIndex((entry) => entry.id === Number(params.id));
      if (index < 0) return commonErrors.notFound();
      items.splice(index, 1);
      return ok({ id: Number(params.id), status: "archived" }, { message: "Prospek diarsipkan." });
    }),
  ];
}

export const leadsHandlers = [
  ...leadHandlersFor("inquiries", "*/api/v1/admin/inquiries"),
  ...leadHandlersFor("whatsappLeads", "*/api/v1/admin/whatsapp-leads"),
];
