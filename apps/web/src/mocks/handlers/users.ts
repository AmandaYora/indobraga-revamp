import { http } from "msw";
import { db, type MockUser } from "@/mocks/db";
import { commonErrors, fail, ok } from "@/mocks/respond";
import {
  clampLimit,
  offsetPaginate,
  parsePage,
  requireAdmin,
  requirePermission,
} from "@/mocks/guard";
import { MOCK_PASSWORD } from "@/mocks/db";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ROLES = new Set(["super_admin", "content_editor"]);

function sanitize(user: MockUser) {
  const { ...rest } = user;
  return rest;
}

export const usersHandlers = [
  http.get("*/api/v1/admin/users", ({ request }) => {
    const session = requireAdmin(request);
    if (session instanceof Response) return session;
    const url = new URL(request.url);
    const page = parsePage(url.searchParams.get("page"));
    const limit = clampLimit(url.searchParams.get("limit"), 10, 100);
    const search = url.searchParams.get("search")?.trim().toLowerCase() ?? "";
    const role = url.searchParams.get("role");
    const status = url.searchParams.get("status");
    let items = [...db.state.users];
    if (role) items = items.filter((item) => item.role === role);
    if (status) items = items.filter((item) => item.status === status);
    if (search) {
      items = items.filter((item) => `${item.name} ${item.email}`.toLowerCase().includes(search));
    }
    const { items: sliced, meta } = offsetPaginate(items, page, limit);
    return ok(sliced.map(sanitize), { meta });
  }),

  http.post("*/api/v1/admin/users", async ({ request }) => {
    const session = requireAdmin(request);
    if (session instanceof Response) return session;
    const permissionError = requirePermission(session, "users.manage");
    if (permissionError) return permissionError;
    const body = (await request.json()) as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const role = String(body.role ?? "");
    const password = typeof body.temporary_password === "string" ? body.temporary_password : "";
    const errors: { field: string | null; message: string }[] = [];
    if (name === "") errors.push({ field: "name", message: "Nama wajib diisi." });
    if (!EMAIL_PATTERN.test(email))
      errors.push({ field: "email", message: "Format email tidak valid." });
    if (!VALID_ROLES.has(role)) errors.push({ field: "role", message: "Peran tidak valid." });
    if (session.user.role !== "super_admin" && role === "super_admin") {
      errors.push({ field: "role", message: "Anda tidak bisa memberi peran Admin Utama." });
    }
    if (password.length < 8)
      errors.push({
        field: "temporary_password",
        message: "Kata sandi sementara minimal 8 karakter.",
      });
    if (errors.length > 0) return commonErrors.validation(errors);
    if (db.state.users.some((item) => item.email.toLowerCase() === email)) {
      return fail(409, "CONFLICT", "Data yang sama sudah ada atau masih dipakai.");
    }
    const user: MockUser = {
      id: db.takeId(),
      name,
      email,
      role: role as MockUser["role"],
      status: "active",
      permissions: [],
      last_login_at: null,
      created_at: db.now(),
      updated_at: db.now(),
    };
    db.state.users.unshift(user);
    void MOCK_PASSWORD;
    return ok(sanitize(user), { message: "Pengguna ditambahkan." });
  }),

  http.get("*/api/v1/admin/users/:id", ({ request, params }) => {
    const session = requireAdmin(request);
    if (session instanceof Response) return session;
    const item = db.state.users.find((entry) => entry.id === Number(params.id));
    if (!item) return commonErrors.notFound();
    return ok(sanitize(item));
  }),

  http.patch("*/api/v1/admin/users/:id", async ({ request, params }) => {
    const session = requireAdmin(request);
    if (session instanceof Response) return session;
    const permissionError = requirePermission(session, "users.manage");
    if (permissionError) return permissionError;
    const item = db.state.users.find((entry) => entry.id === Number(params.id));
    if (!item) return commonErrors.notFound();
    const body = (await request.json()) as Record<string, unknown>;
    if (body.role !== undefined) {
      const role = String(body.role);
      if (!VALID_ROLES.has(role)) {
        return commonErrors.validation([{ field: "role", message: "Peran tidak valid." }]);
      }
      if (session.user.role !== "super_admin" && role === "super_admin") {
        return commonErrors.forbidden("Anda tidak bisa memberi peran Admin Utama.");
      }
      // Tidak bisa menurunkan diri sendiri.
      if (item.id === session.user.id && role !== item.role) {
        return commonErrors.forbidden("Anda tidak bisa mengubah peran akun sendiri.");
      }
      item.role = role as MockUser["role"];
    }
    if (body.name !== undefined) item.name = String(body.name);
    item.updated_at = db.now();
    return ok(sanitize(item), { message: "Pengguna diperbarui." });
  }),

  http.patch("*/api/v1/admin/users/:id/status", async ({ request, params }) => {
    const session = requireAdmin(request);
    if (session instanceof Response) return session;
    const permissionError = requirePermission(session, "users.manage");
    if (permissionError) return permissionError;
    const item = db.state.users.find((entry) => entry.id === Number(params.id));
    if (!item) return commonErrors.notFound();
    const body = (await request.json()) as { status?: unknown };
    const status = String(body.status ?? "");
    if (status !== "active" && status !== "inactive") {
      return commonErrors.validation([{ field: "status", message: "Status tidak valid." }]);
    }
    // Tidak bisa menonaktifkan diri sendiri.
    if (item.id === session.user.id && status === "inactive") {
      return commonErrors.forbidden("Anda tidak bisa menonaktifkan akun sendiri.");
    }
    item.status = status as MockUser["status"];
    item.updated_at = db.now();
    return ok(sanitize(item), {
      message: status === "active" ? "Pengguna diaktifkan." : "Pengguna dinonaktifkan.",
    });
  }),

  http.delete("*/api/v1/admin/users/:id", ({ request, params }) => {
    const session = requireAdmin(request);
    if (session instanceof Response) return session;
    const permissionError = requirePermission(session, "users.manage");
    if (permissionError) return permissionError;
    const id = Number(params.id);
    const item = db.state.users.find((entry) => entry.id === id);
    if (!item) return commonErrors.notFound();
    // Tidak bisa menghapus diri sendiri.
    if (id === session.user.id) {
      return commonErrors.forbidden("Anda tidak bisa menghapus akun sendiri.");
    }
    // Super-admin terakhir tidak bisa dihapus.
    const superAdmins = db.state.users.filter((entry) => entry.role === "super_admin");
    if (item.role === "super_admin" && superAdmins.length <= 1) {
      return fail(409, "CONFLICT", "Admin utama terakhir tidak bisa dihapus.");
    }
    db.state.users.splice(db.state.users.indexOf(item), 1);
    return ok({ id, status: "disabled" }, { message: "Pengguna dihapus." });
  }),
];
