import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { httpClient, registerUnauthorizedHandler } from "@/shared/services/http-client";
import { ApiError } from "@/shared/services/api-error";
import { MOCK_CSRF_TOKEN, MOCK_PASSWORD } from "@/mocks/db";

describe("http-client", () => {
  beforeEach(() => {
    registerUnauthorizedHandler(null);
    delete httpClient.defaults.headers.common["x-csrf-token"];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("unwrap envelope sukses → { data, meta }", async () => {
    const response = await httpClient.get("/api/v1/public/site-settings");
    expect(response.data).toHaveProperty("data");
    expect((response.data as { data: unknown }).data).toHaveProperty("brand");
  });

  it("error 404 → ApiError NOT_FOUND berbahasa Indonesia + requestId", async () => {
    const error = await httpClient.get("/api/v1/public/news/slug-tidak-ada").catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe("NOT_FOUND");
    expect(error.requestId).toMatch(/^req_/);
  });

  it("mengirim header x-csrf-token untuk POST admin", async () => {
    await httpClient.post("/api/v1/auth/login", {
      email: "admin@example.test",
      password: MOCK_PASSWORD,
    });
    // Simulasikan cookie CSRF double-submit; interceptor harus mengirimkannya.
    vi.stubGlobal("document", { cookie: `indobraga_csrf=${MOCK_CSRF_TOKEN}` });
    const withToken = await httpClient
      .post("/api/v1/auth/logout", {})
      .then(() => true)
      .catch(() => false);
    expect(withToken).toBe(true);
  });

  it("tanpa CSRF → 403 FORBIDDEN", async () => {
    await httpClient.post("/api/v1/auth/login", {
      email: "admin@example.test",
      password: MOCK_PASSWORD,
    });
    const error = await httpClient.post("/api/v1/auth/logout", {}).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe("FORBIDDEN");
  });

  it("tidak mengirim CSRF untuk login", async () => {
    // Login tanpa cookie/token CSRF tetap berhasil (csrf:false).
    const response = await httpClient.post("/api/v1/auth/login", {
      email: "admin@example.test",
      password: MOCK_PASSWORD,
    });
    expect(response.status).toBe(200);
  });

  it("401 pada request admin memanggil unauthorized handler", async () => {
    const handler = vi.fn();
    registerUnauthorizedHandler(handler);
    await httpClient.get("/api/v1/admin/dashboard").catch(() => undefined);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("401 pada cek sesi awal tidak memanggil handler", async () => {
    const handler = vi.fn();
    registerUnauthorizedHandler(handler);
    await httpClient.get("/api/v1/auth/me").catch(() => undefined);
    expect(handler).not.toHaveBeenCalled();
  });

  it("timeout → pesan batas waktu", async () => {
    const { server } = await import("@/mocks/server");
    const { http, HttpResponse } = await import("msw");
    server.use(
      http.get("*/api/v1/lambat-simulated", async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return HttpResponse.json({ success: true, message: "ok", data: null });
      }),
    );
    const error = await httpClient.get("/api/v1/lambat-simulated", { timeout: 50 }).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe("NETWORK_ERROR");
    expect(error.message).toContain("batas waktu");
  });

  it("network error → NETWORK_ERROR", async () => {
    const { server } = await import("@/mocks/server");
    const { http, HttpResponse } = await import("msw");
    server.use(http.get("*/api/v1/network-simulated", () => HttpResponse.error()));
    const error = await httpClient.get("/api/v1/network-simulated").catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe("NETWORK_ERROR");
  });

  it("status lain terpetakan (409/413/502)", async () => {
    const { failNextRequest } = await import("@/mocks/server");
    failNextRequest({ status: 409, code: "CONFLICT", message: "Duplikat." });
    const conflict = await httpClient.get("/api/v1/public/site-settings").catch((e) => e);
    expect(conflict.code).toBe("CONFLICT");
    failNextRequest({ status: 413, code: "PAYLOAD_TOO_LARGE", message: "Besar." });
    const large = await httpClient.get("/api/v1/public/site-settings").catch((e) => e);
    expect(large.code).toBe("PAYLOAD_TOO_LARGE");
    failNextRequest({ status: 502, code: "UPSTREAM_ERROR", message: "Upstream." });
    const upstream = await httpClient.get("/api/v1/public/site-settings").catch((e) => e);
    expect(upstream.code).toBe("UPSTREAM_ERROR");
  });
});
