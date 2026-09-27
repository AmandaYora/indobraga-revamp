# ADR-0011: Strategi test & quality gate

## Status
Accepted — 2026-09-26. **Ditangguhkan (deferred) — keputusan owner 2026-09-27:** semua gate pengujian di
ADR ini tidak diberlakukan sampai owner mengaktifkannya kembali. Pemeriksaan statis (typecheck,
lint, format, build, lint & mapping kontrak, `go vet`, `golangci-lint`, `govulncheck`) tetap wajib.

## Context
"Selesai" harus dibuktikan otomatis, bukan dicoba manual. Revamp mengganti seluruh kode, sehingga
paritas dengan legacy harus terukur di tiap lapisan.

## Decision
**Frontend** (detail: PLAN-02 §2.9): unit (Vitest), component & page (Vitest + jsdom + Testing Library
+ MSW), kontrak (setiap request/respons MSW divalidasi `openapi.yaml`), E2E (Playwright, 0 flaky pada 3×
run), visual regression vs baseline legacy (`maxDiffPixelRatio ≤ 0.002`, setiap selisih ditinjau),
aksesibilitas (axe: 0 serious/critical), budget bundle, ESLint/tsc 0 error & 0 warning, coverage
lines ≥ 80%, branches ≥ 75%, functions ≥ 80%.

**Backend** (detail: PLAN-03 §3.12): unit, repository (MySQL nyata), HTTP (router penuh, setiap
respons divalidasi kontrak, 100% operationId ter-test), traceability `LEGACY_CASES.md` 100%, worker
(jam & sender palsu, konkurensi `-race`), SSE, media (golden + benchmark), kompatibilitas kripto dua
arah dengan legacy, SPA shell, archtest boundary modul, `sqlc diff`, migration up/down/up,
`golangci-lint`, `govulncheck` 0, coverage total ≥ 80% & application/domain ≥ 85%.

**Integrasi** (PLAN-04): suite frontend penuh terhadap backend nyata + live contract check, skenario
INT-01..16, Lighthouse CI ≥ baseline legacy, k6, ZAP baseline, Trivy.

**Migrasi** (PLAN-05): verifikasi L1–L6 (jumlah, checksum isi, API, visual, fungsional, SEO/URL).

CI memblokir merge ke `main` bila gate yang relevan merah.

## Consequences
- Setiap BC punya test yang membuktikannya (ADR-0012).
- Waktu CI dijaga < 10 menit untuk PR biasa; suite berat (E2E lintas browser, Lighthouse, k6) di job
  terpisah.
