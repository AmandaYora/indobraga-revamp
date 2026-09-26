# ADR-0006: Autentikasi — cookie session + CSRF double-submit

## Status
Accepted — 2026-09-26

## Context
Template standar menyediakan `JWT_SECRET`/`JWT_EXPIRES_IN`. Legacy memakai cookie session yang
disimpan di DB dan CSRF double-submit, dengan data sesi aktif di produksi yang harus tetap berlaku
setelah migrasi (PLAN-05: admin yang sedang login tetap login).

## Decision
- Token sesi: 32 byte acak (base64url) di cookie `SESSION_COOKIE_NAME` — httpOnly, SameSite=Lax,
  Secure di produksi, path `/`, maxAge = `ADMIN_SESSION_TTL_DAYS` (7).
- DB (`admin_sessions`) menyimpan `HMAC-SHA256(SESSION_SECRET, token)` hex, `ip_hash` (sha256),
  `user_agent` (≤ 500), `expires_at`, `revoked_at`. Tanpa sliding expiry (paritas).
- Setiap request ber-cookie divalidasi: tidak dicabut, belum kedaluwarsa, user aktif.
- CSRF: cookie non-httpOnly `CSRF_COOKIE_NAME` (32 byte acak) di-set saat login; method non-aman pada
  route ber-guard wajib mengirim header `x-csrf-token` yang sama (compare constant-time, BC-09).
- Role `super_admin`/`content_editor` + peta permission identik legacy
  (`packages/api-contract/src/components/schemas/common.yaml#/Permission`).
- Semua route `/api/v1/admin/*` wajib sesi, ditentukan dari registrasi route (bukan pencocokan string).
- `JWT_*` dari template standar tidak dipakai; `.env.example` memakai variabel sesi.

## Alternatives rejected
- *JWT stateless*: tidak bisa mencabut sesi seketika (dibutuhkan saat user dinonaktifkan/ganti
  password) dan memutus sesi legacy saat migrasi.

## Consequences
- Format token/hash kompatibel byte-per-byte dengan legacy → sesi bisa dimigrasi bila
  `SESSION_SECRET` dipakai ulang (ADR-0014).
- Janitor membersihkan sesi kedaluwarsa (BC-08).
