# 000 — Analisis Kelayakan Revamp Indobraga (2026-09-26)

> Artefak `analysis/`: tidak diedit setelah ditulis. Pemahaman baru → folder analisis baru.

## Pertanyaan
Apakah `indobraga` (NestJS 11 + Prisma 7 + TanStack Start SSR) bisa di-revamp menjadi monorepo
modular monolith sesuai **Dimas Monorepo Standard** dengan backend **Go**, tanpa kehilangan desain
maupun capability?

## Jawaban
**Bisa.** Frontend legacy sudah React 19 + Tailwind 4, sehingga desain dapat dipindah 1:1 — yang
diganti adalah lapisan router/SSR/data, bukan tampilan. Setiap capability backend punya padanan Go.
Format kripto legacy (bcrypt, HMAC-SHA256 session token, AES-256-GCM `v1:iv:tag:ct`) kompatibel
dengan library standar Go, sehingga data, password, sesi, dan akun email bisa dimigrasikan tanpa
reset.

## Skala legacy
| Area | Ukuran |
|---|---|
| Backend | ±13.300 baris TS, 19 modul Nest, **160 endpoint**, 31 tabel, 2 worker, SSE |
| Frontend | ±13.300 baris TSX, 25 halaman (7 publik, 18 admin) + login, robots.txt, sitemap.xml |
| Test | 43 file unit (±207 case) + 11 file e2e (43 case) backend; 28 file test frontend |

## Satu-satunya capability berisiko: SSR
Keputusan user (2026-09-26): **SPA + Go menyisipkan head & data awal per route** (title, meta, OG,
canonical, JSON-LD, bootstrap JSON, preload gambar LCP). Cadangan: snapshot HTML konten bila Search
Console menunjukkan regresi. Lihat `plans/` dan ADR SEO.

## Keputusan user lain (2026-09-26)
- `indobraga-revamp` menjadi **repo git sendiri**.
- Produksi revamp di **VPS baru** (bukan VPS legacy).
- Struktur data **boleh berubah** bila struktur lama kurang ideal, asalkan dari sudut pandang user
  tidak ada yang berbeda → migrasi data via ETL.
- Revamp dibagi 5 plan: setup → frontend → backend → integrasi → migrasi data.

## Referensi
- [backend.md](backend.md) — inventaris backend (endpoint, tabel, integrasi, worker, quirk).
- [frontend.md](frontend.md) — inventaris frontend (SSR, route, fitur, design system, test, deploy).
- [PRD-legacy.md](PRD-legacy.md) — PRD legacy apa adanya.
