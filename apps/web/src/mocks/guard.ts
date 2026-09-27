import { db, MOCK_CSRF_TOKEN, type MockSession } from "@/mocks/db";
import { commonErrors, fail } from "@/mocks/respond";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const LOGIN_WINDOW_MS = 60_000;
const LOGIN_MAX = 5;
const LEAD_WINDOW_MS = 60_000;
const LEAD_MAX = 10;

/** Konsumsi injeksi error test bila ada. */
export function consumeTestFailure() {
  const failure = db.consumeFailure();
  if (!failure) return null;
  return fail(failure.status, failure.code, failure.message);
}

export function parsePage(value: string | null): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

export function clampLimit(value: string | null, fallback: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

export function requireSession(): MockSession | Response {
  const failure = consumeTestFailure();
  if (failure) return failure;
  const session = db.state.session;
  if (!session) return commonErrors.unauthenticated();
  return session;
}

/** CSRF double-submit untuk method unsafe (kecuali login — ditangani pemanggil). */
export function requireCsrf(request: Request): Response | null {
  if (!UNSAFE_METHODS.has(request.method.toUpperCase())) return null;
  if (request.headers.get("x-csrf-token") !== MOCK_CSRF_TOKEN) {
    return fail(403, "FORBIDDEN", "Token CSRF tidak valid.");
  }
  return null;
}

export function requireAdmin(request: Request): MockSession | Response {
  const session = requireSession();
  if (session instanceof Response) return session;
  const csrfError = requireCsrf(request);
  if (csrfError) return csrfError;
  return session;
}

export function requirePermission(session: MockSession, permission: string): Response | null {
  if (session.user.role === "super_admin") return null;
  if (session.user.permissions.includes(permission)) return null;
  return commonErrors.forbidden();
}

function slidingCount(attempts: number[], windowMs: number): number {
  const cutoff = Date.now() - windowMs;
  return attempts.filter((timestamp) => timestamp > cutoff).length;
}

/** Rate limit login 5/60 dtk per IP (disimulasikan global — satu slot sesi mock). */
export function checkLoginRateLimit(): Response | null {
  db.state.loginAttempts = db.state.loginAttempts.filter(
    (timestamp) => timestamp > Date.now() - LOGIN_WINDOW_MS,
  );
  if (slidingCount(db.state.loginAttempts, LOGIN_WINDOW_MS) >= LOGIN_MAX) {
    return commonErrors.rateLimited(60);
  }
  db.state.loginAttempts.push(Date.now());
  return null;
}

/** Rate limit prospek publik 10/60 dtk. */
export function checkLeadRateLimit(): Response | null {
  db.state.leadAttempts = db.state.leadAttempts.filter(
    (timestamp) => timestamp > Date.now() - LEAD_WINDOW_MS,
  );
  if (slidingCount(db.state.leadAttempts, LEAD_WINDOW_MS) >= LEAD_MAX) {
    return commonErrors.rateLimited(60);
  }
  db.state.leadAttempts.push(Date.now());
  return null;
}

export function offsetMeta(page: number, limit: number, total: number) {
  return { page, limit, total, total_pages: Math.max(1, Math.ceil(total / Math.max(1, limit))) };
}

export function offsetPaginate<T>(items: T[], page: number, limit: number) {
  const total = items.length;
  const start = (page - 1) * limit;
  return { items: items.slice(start, start + limit), meta: offsetMeta(page, limit, total) };
}
