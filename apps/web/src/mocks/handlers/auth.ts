import { http } from "msw";
import { db, MOCK_CSRF_TOKEN, MOCK_PASSWORD } from "@/mocks/db";
import { commonErrors, fail, ok } from "@/mocks/respond";
import { checkLoginRateLimit, consumeTestFailure, requireCsrf } from "@/mocks/guard";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const authHandlers = [
  http.post("*/api/v1/auth/login", async ({ request }) => {
    const failure = consumeTestFailure();
    if (failure) return failure;
    const limited = checkLoginRateLimit();
    if (limited) return limited;
    const body = (await request.json()) as { email?: unknown; password?: unknown };
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!EMAIL_PATTERN.test(email) || password.length < 8) {
      return commonErrors.validation([
        {
          field: !EMAIL_PATTERN.test(email) ? "email" : "password",
          message: "Email atau kata sandi belum sesuai.",
        },
      ]);
    }
    const user = db.state.users.find((entry) => entry.email.toLowerCase() === email);
    if (!user || user.status !== "active" || password !== MOCK_PASSWORD) {
      return fail(401, "UNAUTHENTICATED", "Email atau kata sandi belum sesuai.");
    }
    user.last_login_at = db.now();
    db.state.session = { user: { ...user } };
    return ok(
      { user: { ...user } },
      {
        message: "Login berhasil.",
        status: 200,
      },
    );
  }),

  http.post("*/api/v1/auth/logout", ({ request }) => {
    const failure = consumeTestFailure();
    if (failure) return failure;
    if (!db.state.session) return commonErrors.unauthenticated();
    const csrfError = requireCsrf(request);
    if (csrfError) return csrfError;
    db.state.session = null;
    return ok({ status: "logged_out" }, { message: "Anda sudah keluar." });
  }),

  http.get("*/api/v1/auth/me", () => {
    const failure = consumeTestFailure();
    if (failure) return failure;
    const session = db.state.session;
    if (!session) return commonErrors.unauthenticated();
    return ok({ user: { ...session.user } });
  }),
];

export { MOCK_CSRF_TOKEN };
