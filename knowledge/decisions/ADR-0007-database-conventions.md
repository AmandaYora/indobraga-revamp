# ADR-0007: Konvensi database & perubahan skema terhadap legacy

## Status
Accepted — 2026-09-26 (DDL final dibekukan di PLAN-03 fase B2)

## Context
Skema legacy (Prisma, 31 tabel) punya ENUM uppercase yang di-map ke lowercase di API, `updated_at`
tanpa default DB, ±22 foreign key lintas modul, kolom URL media absolut, dan kolom yang tidak pernah
dipakai. Dimas mengizinkan struktur data berubah selama pengalaman user tetap sama (PLAN-05).

## Decision
- **MySQL 8 di host**, `utf8mb4` + collation `utf8mb4_unicode_ci` (sama dengan legacy → urutan sortir
  & pencarian identik), timestamp `DATETIME(3)` UTC.
- `created_at DEFAULT CURRENT_TIMESTAMP(3)`, `updated_at DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE
  CURRENT_TIMESTAMP(3)` (BC-10).
- Enum = `VARCHAR(32)` + `CHECK`, **nilai = nilai API lowercase** (BC-13) — tanpa lapisan mapping,
  perubahan enum tanpa `ALTER ... ENUM`.
- **FK hanya di dalam satu modul.** Relasi lintas modul = ID primitif + index; aturan integritas
  (blok hapus bila dipakai, dsb.) di aplikasi lewat contract. Tidak ada join lintas modul.
- ID `INT UNSIGNED AUTO_INCREMENT`; ID legacy dipertahankan saat migrasi.
- Migration: golang-migrate, satu set berurutan per modul, setiap `up` punya `down` yang teruji;
  aturan **expand/contract** (migration kompatibel dengan versi aplikasi sebelumnya).
- Akses data: sqlc per modul (`sqlc.yaml` satu blok per modul) + `database/sql`; tanpa GORM.
- Perubahan terhadap legacy (rinci di PLAN-03 §3.3): media menyimpan object key + tabel
  `media_variants` (URL diturunkan); `portfolios` tanpa kolom teks kategori & `image_media_id`
  (cover = gambar urutan pertama); `email_campaigns.name` → `title`; provider email `google`/`smtp`;
  `marketing_contacts.tags` dihapus; `revalidation_events` dihapus; audit mengisi `ip_hash` &
  `user_agent`.

## Consequences
- Migrasi data memakai ETL (PLAN-05) dengan pemetaan per tabel yang teruji.
- `knowledge/DATABASE.md` adalah sumber skema; `MODULE_MAP.md` hanya indeks nama tabel.
