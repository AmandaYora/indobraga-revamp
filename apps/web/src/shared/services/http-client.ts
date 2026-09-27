import axios, { AxiosError, type AxiosResponse } from "axios";
import { ApiError, type ApiClientErrorCode } from "@/shared/services/api-error";
import { getCsrfToken } from "@/shared/services/csrf";
import type { ContractSchemas } from "@/shared/types/contract";

export const API_PREFIX = "/api/v1";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface CursorMeta {
  limit: number;
  next_cursor: string | null;
  has_more: boolean;
}

export interface ApiData<T> {
  data: T;
  meta?: PageMeta | CursorMeta;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function statusToCode(status?: number): ApiClientErrorCode {
  switch (status) {
    case 400:
      return "BAD_REQUEST";
    case 401:
      return "UNAUTHENTICATED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    case 413:
      return "PAYLOAD_TOO_LARGE";
    case 415:
      return "UNSUPPORTED_MEDIA_TYPE";
    case 422:
      return "UNPROCESSABLE_ENTITY";
    case 429:
      return "RATE_LIMITED";
    case 502:
      return "UPSTREAM_ERROR";
    case 503:
      return "SERVICE_UNAVAILABLE";
    default:
      return status !== undefined && status >= 500 ? "INTERNAL_ERROR" : "BAD_REQUEST";
  }
}

/** Handler 401 — didaftarkan oleh `auth` store agar http-client bebas dependensi modul. */
let unauthorizedHandler: ((path: string) => void) | null = null;

export function registerUnauthorizedHandler(handler: ((path: string) => void) | null) {
  unauthorizedHandler = handler;
}

function toApiError(status: number | undefined, payload: unknown, requestId?: string): ApiError {
  if (isRecord(payload) && payload.success === false) {
    const code = (
      typeof payload.code === "string" ? payload.code : statusToCode(status)
    ) as ApiClientErrorCode;
    const message =
      typeof payload.message === "string" ? payload.message : "Permintaan belum bisa diproses.";
    const errors = Array.isArray(payload.errors)
      ? payload.errors
          .filter(isRecord)
          .map((detail) => ({
            field: typeof detail.field === "string" ? detail.field : null,
            message: typeof detail.message === "string" ? detail.message : "",
          }))
          .filter((detail) => detail.message.length > 0)
      : [];
    const rid = typeof payload.request_id === "string" ? payload.request_id : requestId;
    return new ApiError({ code, message, status, errors, requestId: rid });
  }
  return new ApiError({
    code: status !== undefined ? statusToCode(status) : "BAD_RESPONSE",
    message: "Data belum bisa dibaca. Muat ulang halaman lalu coba lagi.",
    status,
    requestId,
  });
}

/**
 * Satu-satunya instance Axios di aplikasi (PLAN-02 §2.3).
 * - `baseURL = VITE_API_BASE_URL || ""`, prefix `/api/v1`, timeout 30 dtk.
 * - CSRF double-submit untuk POST/PUT/PATCH/DELETE (kecuali login).
 * - Unwrap envelope v1 → `{ data, meta }`; error → `ApiError` berbahasa Indonesia.
 * - 401 pada request admin (selain cek sesi awal) → reset sesi + redirect login.
 */
export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "",
  timeout: 30000,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

httpClient.interceptors.request.use((config) => {
  const method = (config.method ?? "GET").toUpperCase();
  const url = config.url ?? "";
  const isLogin = url === `${API_PREFIX}/auth/login` || url.endsWith("/auth/login");
  if (UNSAFE_METHODS.has(method) && !isLogin) {
    const token = getCsrfToken();
    if (token) config.headers.set("x-csrf-token", token);
  }
  return config;
});

httpClient.interceptors.response.use(
  (response: AxiosResponse) => {
    const payload = response.data;
    if (isRecord(payload) && payload.success === true && "data" in payload) {
      const meta = isRecord(payload.meta)
        ? (payload.meta as unknown as PageMeta | CursorMeta)
        : undefined;
      response.data = { data: payload.data, meta } satisfies ApiData<unknown>;
      return response;
    }
    return Promise.reject(toApiError(response.status, payload, response.headers["x-request-id"]));
  },
  (error: unknown) => {
    if (axios.isCancel(error)) {
      return Promise.reject(
        new ApiError({ code: "BAD_RESPONSE", message: "Permintaan dibatalkan." }),
      );
    }
    if (error instanceof AxiosError) {
      if (!error.response) {
        const isTimeout = error.code === "ECONNABORTED" || /timeout/i.test(error.message);
        return Promise.reject(
          new ApiError({
            code: "NETWORK_ERROR",
            message: isTimeout
              ? "Permintaan melebihi batas waktu. Coba lagi nanti."
              : "Koneksi bermasalah. Periksa internet lalu coba lagi.",
          }),
        );
      }
      const { status, data, headers, config } = error.response;
      const requestId =
        typeof headers?.["x-request-id"] === "string" ? headers["x-request-id"] : undefined;
      const apiError = toApiError(status, data, requestId);
      // Cocok untuk URL relatif maupun absolut (test node memakai baseURL absolut).
      const url = config?.url ?? "";
      const isSessionCheck = url.endsWith("/auth/me") || url.endsWith("/auth/login");
      const isPublicRequest = url.includes(`${API_PREFIX}/public/`);
      const isHealthRequest = url.includes(`${API_PREFIX}/health`);
      const isAdminRequest = url.includes(API_PREFIX) && !isPublicRequest && !isHealthRequest;
      if (status === 401 && isAdminRequest && !isSessionCheck && unauthorizedHandler) {
        unauthorizedHandler(
          typeof window === "undefined" ? "/" : window.location.pathname + window.location.search,
        );
      }
      return Promise.reject(apiError);
    }
    return Promise.reject(
      new ApiError({ code: "INTERNAL_ERROR", message: "Terjadi kendala. Coba lagi nanti." }),
    );
  },
);

export type { ContractSchemas };
