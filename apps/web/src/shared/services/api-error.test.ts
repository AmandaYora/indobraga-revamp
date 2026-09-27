import { describe, expect, it } from "vitest";
import {
  ApiError,
  getUserFacingErrorMessage,
  getUserFacingErrorTitle,
} from "@/shared/services/api-error";

function apiError(code: string, message: string) {
  return new ApiError({ code: code as never, message });
}

describe("getUserFacingErrorMessage", () => {
  it("memetakan kode admin ke Bahasa Indonesia (pesan backend teknis dibuang)", () => {
    expect(getUserFacingErrorMessage(apiError("RATE_LIMITED", "throttler exception"))).toContain(
      "Terlalu banyak aktivitas",
    );
    expect(
      getUserFacingErrorMessage(apiError("UNAUTHENTICATED", "session cookie invalid")),
    ).toContain("Sesi Anda sudah berakhir");
    expect(getUserFacingErrorMessage(apiError("NOT_FOUND", "resource DEAAD missing"))).toBe(
      "Data tidak ditemukan.",
    );
  });

  it("pesan backend yang aman ditampilkan apa adanya (paritas legacy)", () => {
    expect(getUserFacingErrorMessage(apiError("BAD_REQUEST", "Email sudah dipakai."))).toBe(
      "Email sudah dipakai.",
    );
  });

  it("audience publik memakai pesan publik", () => {
    expect(
      getUserFacingErrorMessage(apiError("NOT_FOUND", "x"), {
        audience: "public",
        surface: "page",
      }),
    ).toBe("Konten tidak ditemukan.");
  });

  it("aksi login memakai pesan login khusus", () => {
    expect(getUserFacingErrorMessage(apiError("UNAUTHENTICATED", "x"), { action: "login" })).toBe(
      "Email atau kata sandi belum sesuai.",
    );
    expect(getUserFacingErrorMessage(apiError("RATE_LIMITED", "x"), { action: "login" })).toContain(
      "percobaan masuk",
    );
  });

  it("VALIDATION_ERROR menggabung maks 2 detail dengan label field", () => {
    const error = new ApiError({
      code: "VALIDATION_ERROR",
      message: "Periksa kembali isian yang belum sesuai.",
      errors: [
        { field: "recipients.0.email", message: "Format email tidak valid." },
        { field: "custom_field", message: "Tidak sesuai." },
        { field: "name", message: "Nama minimal 2 karakter." },
      ],
    });
    const message = getUserFacingErrorMessage(error);
    expect(message).toContain("Format email tidak valid.");
    expect(message).toContain("Tidak sesuai.");
    expect(message).not.toContain("Nama minimal");
  });

  it("membuang pesan backend yang teknis", () => {
    expect(getUserFacingErrorMessage(apiError("BAD_REQUEST", "throttler exception backend"))).toBe(
      "Permintaan belum bisa diproses. Periksa kembali data yang diisi.",
    );
    expect(getUserFacingErrorMessage(new Error("something failed"))).toBe("something failed");
    expect(getUserFacingErrorMessage(new Error("backend throttler exception"))).toBe(
      "Terjadi kendala. Coba lagi nanti.",
    );
  });

  it("audience publik + title publik + validasi tanpa field", () => {
    const noField = new ApiError({
      code: "VALIDATION_ERROR",
      message: "Periksa kembali isian yang belum sesuai.",
      errors: [{ field: null, message: "Data tidak valid." }],
    });
    expect(getUserFacingErrorMessage(noField)).toBe("Data tidak valid.");
    expect(getUserFacingErrorTitle(apiError("BAD_REQUEST", "x"), { audience: "public" })).toBe(
      "Konten belum bisa ditampilkan",
    );
    expect(getUserFacingErrorTitle(apiError("BAD_REQUEST", "x"))).toBe("Data gagal dimuat");
  });
  it("judul khusus rate limit, sesi, dan validasi", () => {
    expect(
      getUserFacingErrorTitle(apiError("RATE_LIMITED", "throttler"), { action: "login" }),
    ).toBe("Tunggu sebentar");
    expect(getUserFacingErrorTitle(apiError("UNAUTHENTICATED", "session"))).toBe("Sesi berakhir");
    expect(getUserFacingErrorTitle(apiError("VALIDATION_ERROR", "payload"))).toBe("Periksa isian");
  });
});
