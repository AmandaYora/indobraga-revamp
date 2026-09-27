import type { ErrorCode } from "@/shared/types/contract";

export type ApiClientErrorCode = ErrorCode | "NETWORK_ERROR" | "BAD_RESPONSE";

export interface ApiErrorDetail {
  field?: string | null;
  message: string;
}

/**
 * Error terstruktur untuk seluruh request API (port `ApiClientError` legacy).
 * `message` selalu aman ditampilkan ke user (Bahasa Indonesia).
 */
export class ApiError extends Error {
  code: ApiClientErrorCode;
  status?: number;
  errors: ApiErrorDetail[];
  requestId?: string;

  constructor(options: {
    code: ApiClientErrorCode;
    message: string;
    status?: number;
    errors?: ApiErrorDetail[];
    requestId?: string;
  }) {
    super(options.message);
    this.name = "ApiError";
    this.code = options.code;
    this.status = options.status;
    this.errors = options.errors ?? [];
    this.requestId = options.requestId;
  }
}

const ADMIN_MESSAGES: Record<string, string> = {
  BAD_REQUEST: "Permintaan belum bisa diproses. Periksa kembali data yang diisi.",
  BAD_RESPONSE: "Data belum bisa dibaca. Muat ulang halaman lalu coba lagi.",
  CONFLICT: "Data yang sama sudah ada atau masih dipakai.",
  FORBIDDEN: "Akun Anda belum memiliki akses untuk tindakan ini.",
  INTERNAL_ERROR: "Sistem sedang mengalami kendala. Coba lagi nanti.",
  NETWORK_ERROR: "Koneksi bermasalah. Periksa internet lalu coba lagi.",
  NOT_FOUND: "Data tidak ditemukan.",
  PAYLOAD_TOO_LARGE: "File atau data yang dikirim terlalu besar.",
  RATE_LIMITED: "Terlalu banyak aktivitas dalam waktu singkat. Tunggu sebentar lalu coba lagi.",
  SERVICE_UNAVAILABLE: "Layanan sementara tidak tersedia. Coba lagi nanti.",
  UNAUTHENTICATED: "Sesi Anda sudah berakhir. Silakan masuk kembali.",
  UNPROCESSABLE_ENTITY: "Data belum bisa diproses. Periksa kembali isinya.",
  UNSUPPORTED_MEDIA_TYPE: "Format file belum didukung.",
  UPSTREAM_ERROR: "Layanan terhubung sedang bermasalah. Coba lagi nanti.",
  VALIDATION_ERROR: "Periksa kembali isian yang belum sesuai.",
  MEDIA_CLEANUP_FAILED: "Sebagian file lama belum bisa dibersihkan. Coba lagi nanti.",
};

const PUBLIC_MESSAGES: Record<string, string> = {
  ...ADMIN_MESSAGES,
  BAD_RESPONSE: "Konten belum bisa ditampilkan. Muat ulang halaman atau coba lagi nanti.",
  FORBIDDEN: "Akses belum tersedia.",
  INTERNAL_ERROR: "Konten belum bisa ditampilkan. Coba lagi nanti.",
  NOT_FOUND: "Konten tidak ditemukan.",
  SERVICE_UNAVAILABLE: "Website sedang sulit diakses. Coba lagi nanti.",
  UNAUTHENTICATED: "Sesi Anda sudah berakhir. Muat ulang halaman lalu coba lagi.",
  UPSTREAM_ERROR: "Konten belum bisa ditampilkan. Coba lagi nanti.",
};

const TECHNICAL_COPY_PATTERN =
  /\b(request|response|backend|frontend|csrf|payload|resource|json|contract|kontrak|throttler|exception|stack|undefined|null|provider|oauth|internal worker secret|session cookie|http-only|derivative|revalidasi|reorder)\b|too many requests/i;

function safeBackendMessage(message: string | undefined): string | undefined {
  const trimmed = message?.trim();
  if (!trimmed || TECHNICAL_COPY_PATTERN.test(trimmed)) return undefined;
  return trimmed;
}

export type ErrorAudience = "admin" | "public";
export type ErrorSurface = "page" | "toast";
export type ErrorAction = "login" | "save" | "upload" | "delete" | "send" | "load";

export interface UserFacingErrorOptions {
  action?: ErrorAction;
  audience?: ErrorAudience;
  surface?: ErrorSurface;
}

const FIELD_LABELS: Record<string, string> = {
  email: "Email",
  phone: "Nomor telepon",
  password: "Kata sandi",
  temporary_password: "Kata sandi sementara",
  new_password: "Kata sandi baru",
  name: "Nama",
  title: "Judul",
  slug: "Alamat halaman",
  subject: "Subjek",
  message: "Pesan",
  seo_title: "Judul Google",
  seo_description: "Deskripsi Google",
  to_email: "Email tujuan",
  to_name: "Nama penerima",
  email_account_id: "Akun pengirim",
  body_text: "Isi email",
  body_html: "Isi email (HTML)",
};

function fieldLabel(field: string): string {
  const key = field.split(".").pop() ?? field;
  return FIELD_LABELS[key] ?? key.replace(/_/g, " ");
}

/** Pesan Indonesia yang aman ditampilkan (port `user-facing-error` legacy). */
export function getUserFacingErrorMessage(
  error: unknown,
  options: UserFacingErrorOptions = {},
): string {
  const { action, audience = "admin", surface } = options;
  const fallback =
    audience === "public"
      ? "Konten belum bisa ditampilkan. Coba lagi nanti."
      : "Terjadi kendala. Coba lagi nanti.";
  if (!(error instanceof ApiError)) {
    if (error instanceof Error) return safeBackendMessage(error.message) ?? fallback;
    return fallback;
  }
  if (audience === "public" && surface === "page") {
    if (error.code === "RATE_LIMITED")
      return "Terlalu banyak aktivitas. Tunggu sebentar lalu muat ulang halaman.";
    return PUBLIC_MESSAGES[error.code] ?? fallback;
  }
  if (action === "login") {
    if (error.code === "RATE_LIMITED")
      return "Terlalu banyak percobaan masuk. Tunggu sekitar 1 menit lalu coba lagi.";
    if (error.code === "UNAUTHENTICATED") return "Email atau kata sandi belum sesuai.";
    return safeBackendMessage(error.message) ?? ADMIN_MESSAGES[error.code] ?? fallback;
  }
  if (error.code === "VALIDATION_ERROR" && error.errors.length > 0) {
    const parts = error.errors.slice(0, 2).map((detail) => {
      const safe = safeBackendMessage(detail.message);
      if (!detail.field) return safe ?? ADMIN_MESSAGES.VALIDATION_ERROR;
      return safe ?? `${fieldLabel(detail.field)} belum sesuai.`;
    });
    return parts.join(" ");
  }
  return safeBackendMessage(error.message) ?? ADMIN_MESSAGES[error.code] ?? fallback;
}

export function getUserFacingErrorTitle(
  error: unknown,
  options: UserFacingErrorOptions = {},
): string {
  const { action, audience = "admin" } = options;
  if (error instanceof ApiError) {
    if (error.code === "RATE_LIMITED")
      return action === "login" ? "Tunggu sebentar" : "Aktivitas terlalu cepat";
    if (error.code === "UNAUTHENTICATED")
      return action === "login" ? "Masuk gagal" : "Sesi berakhir";
    if (error.code === "VALIDATION_ERROR") return "Periksa isian";
  }
  return audience === "public" ? "Konten belum bisa ditampilkan" : "Data gagal dimuat";
}
