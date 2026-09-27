import { HttpResponse } from "msw";

let requestSeq = 0;

export function nextRequestId(): string {
  requestSeq += 1;
  return `req_mock-${String(requestSeq).padStart(6, "0")}`;
}

export function resetRequestSeqForTest() {
  requestSeq = 0;
}

export interface SuccessBody {
  success: true;
  message: string;
  data: unknown;
  meta?: unknown;
}

export interface ErrorBody {
  success: false;
  code: string;
  message: string;
  errors: { field: string | null; message: string }[];
  request_id: string;
}

/** Envelope sukses v1 + header `X-Request-Id` (ADR-0004). */
export function ok(data: unknown, init?: { meta?: unknown; message?: string; status?: number }) {
  const requestId = nextRequestId();
  const body: SuccessBody = {
    success: true,
    message: init?.message ?? "Data berhasil diambil.",
    data,
  };
  if (init?.meta !== undefined) body.meta = init.meta;
  return HttpResponse.json(body, {
    status: init?.status ?? 200,
    headers: { "X-Request-Id": requestId },
  });
}

/** Envelope error v1 (pesan Indonesia) + header `X-Request-Id`. */
export function fail(
  status: number,
  code: string,
  message: string,
  errors: { field: string | null; message: string }[] = [],
) {
  const requestId = nextRequestId();
  const body: ErrorBody = { success: false, code, message, errors, request_id: requestId };
  return HttpResponse.json(body, {
    status,
    headers: { "X-Request-Id": requestId },
  });
}

export const commonErrors = {
  unauthenticated: () =>
    fail(401, "UNAUTHENTICATED", "Sesi Anda sudah berakhir. Silakan masuk kembali."),
  forbidden: (message = "Akun Anda belum memiliki akses untuk tindakan ini.") =>
    fail(403, "FORBIDDEN", message),
  notFound: (message = "Data tidak ditemukan.") => fail(404, "NOT_FOUND", message),
  rateLimited: (retryAfter = 60) =>
    HttpResponse.json(
      {
        success: false,
        code: "RATE_LIMITED",
        message: "Terlalu banyak aktivitas dalam waktu singkat. Tunggu sebentar lalu coba lagi.",
        errors: [],
        request_id: nextRequestId(),
      },
      {
        status: 429,
        headers: { "X-Request-Id": nextRequestId(), "Retry-After": String(retryAfter) },
      },
    ),
  validation: (
    errors: { field: string | null; message: string }[],
    message = "Periksa kembali isian yang belum sesuai.",
  ) => fail(400, "VALIDATION_ERROR", message, errors),
};
