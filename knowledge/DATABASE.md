# Database

> Status: **konvensi final (ADR-0007), DDL belum** — DDL per modul ditulis dan dibekukan di PLAN-03
> fase B2, lalu menjadi input ETL PLAN-05. Skema legacy: `analysis/000-legacy-inventory/backend.md` §9.

## Konvensi

- MySQL 8 di host; database `indobraga_revamp` (dev), `indobraga_revamp_test` (test), produksi di VPS.
- `CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci` (sama dengan legacy).
- Timestamp `DATETIME(3)` UTC; koneksi Go `parseTime=true&loc=UTC`.
- `created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)`,
  `updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)`.
- PK `id INT UNSIGNED AUTO_INCREMENT` (ID legacy dipertahankan saat migrasi).
- Enum: `VARCHAR(32)` + `CHECK (kolom IN (...))`, nilai lowercase = nilai API.
- JSON memakai tipe `JSON` hanya untuk data milik modul itu sendiri.
- Ukuran byte media `BIGINT UNSIGNED`.
- FK hanya antar-tabel dalam satu modul. Kolom referensi lintas modul: `<entity>_id INT UNSIGNED`
  + index, tanpa FK; validasi lewat contract modul pemilik.
- Tidak ada join lintas modul; data gabungan dirakit di application layer (batch by IDs, bukan N+1).
- Migration golang-migrate di `apps/api/migrations/`, file per modul berurutan, `up` + `down`
  teruji, aturan expand/contract.
- Query sqlc di `internal/modules/<m>/infrastructure/queries/*.sql` → `infrastructure/sqlc/`.

## Kepemilikan tabel (rancangan)

| Modul | Tabel | Relasi lintas modul (ID primitif) |
|---|---|---|
| users | `users` | – |
| auth | `admin_sessions` | `user_id` → users |
| audit | `audit_logs` | `actor_user_id` → users |
| media | `media_files`, `media_variants` (FK ke `media_files`) | `created_by_id`, `archived_by`, `deleted_by` → users |
| settings | `site_settings` | 4 kolom media → media |
| profile | `hero_sections`, `hero_slides` (FK ke hero), `partners`, `production_strengths`, `machines`, `printing_capacities`, `production_capacities`, `services` | kolom media → media; `archived_by` → users |
| portfolio | `portfolio_categories`, `portfolios` (FK ke kategori), `portfolio_images` (FK ke portofolio) | `media_file_id` → media |
| gallery | `gallery_items` | `media_file_id`, `poster_media_id` → media |
| news | `news` | `thumbnail_media_id`, `og_media_id` → media |
| leads | `inquiries`, `whatsapp_leads` | – |
| audience | `marketing_contacts` | `source_ref_id` → leads |
| notifications | `notifications`, `notification_reads` (FK ke notifikasi), `notification_email_jobs` (FK ke notifikasi) | `notification_reads.user_id` → users |
| emailaccounts | `email_accounts`, `email_oauth_states` | `admin_user_id` → users |
| emailtemplates | `email_templates` | – |
| campaigns | `email_campaigns`, `email_campaign_recipients` (FK), `email_send_logs` (FK) | `sender_account_id` → emailaccounts, `created_by_id` → users, `marketing_contact_id` → audience |

## Perubahan terhadap legacy

Lihat ADR-0007 dan `plans/PLAN-03-backend.md` §3.3: media → object key + `media_variants`;
`portfolios` tanpa `category` teks & `image_media_id`; `email_campaigns.name` → `title`; provider
`google`/`smtp`; `marketing_contacts.tags` & `revalidation_events` dihapus; audit mengisi `ip_hash` &
`user_agent`; ±22 FK lintas modul dihapus.
