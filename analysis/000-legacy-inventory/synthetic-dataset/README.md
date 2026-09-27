# Dataset sintetis legacy (PLAN-01 §1.7)

Data **fiktif** untuk skema database **legacy** (Prisma, migration terakhir
`20260624000000_site_footer_logo_media`). Dipakai untuk baseline admin legacy dan menjadi sumber
fixture admin di `apps/web/src/mocks/fixtures/legacy-admin/`. PLAN-03 §3.10 menurunkan versi skema
baru darinya (`apps/api/testdata/synthetic/`) dan PLAN-05 memakainya untuk menguji alat ETL.

> Semua email memakai domain `example.test`, telepon berpola `0812-0…`. Tidak ada data pribadi nyata.
> Repo ini public — jangan pernah menambahkan data produksi ke folder ini.

## Asal

`dataset.sql` adalah dump data-only (`mysqldump --no-create-info --complete-insert
--skip-extended-insert --order-by-primary`, tanpa tabel `_prisma_migrations`) dari database lokal
`indobraga_legacy_baseline` pada 2026-09-27. Generator aslinya tidak tersimpan di repo, sehingga dump
inilah sumber kebenarannya.

## Isi (jumlah baris)

| Tabel | Baris | Tabel | Baris |
|---|---|---|---|
| users | 2 | inquiries | 30 |
| admin_sessions | 0 | whatsapp_leads | 10 |
| audit_logs | 5 | marketing_contacts | 12 |
| site_settings | 1 | email_accounts | 3 |
| hero_sections | 3 | email_oauth_states | 0 |
| hero_slides | 6 | email_templates | 4 |
| partners | 8 | email_campaigns | 6 |
| production_strengths | 6 | email_campaign_recipients | 23 |
| portfolio_categories | 7 | email_send_logs | 8 |
| portfolios | 30 | notifications | 8 |
| portfolio_images | 18 | notification_reads | 2 |
| machines | 6 | notification_email_jobs | 2 |
| printing_capacities | 6 | revalidation_events | 4 |
| production_capacities | 6 | media_files | 34 |
| services | 8 | | |
| gallery_items | 30 | | |
| news | 30 | | |

Kekurangan terhadap spesifikasi PLAN-01 §1.7 (belum ditambahkan): `partners` < 26 baris (pagination
list partner belum teruji), hanya 2 user (tanpa user nonaktif), 3 akun email (spesifikasi: Google
connected, SMTP connected, SMTP needs_reconnect, disabled).

## Memuat ke database lokal

```bash
# 1. Skema legacy (dari repo legacy, DATABASE_URL diarahkan ke DB baseline)
cd ../indobraga/apps/api
DATABASE_URL="mysql://indobraga:<password>@127.0.0.1:3306/indobraga_legacy_baseline" npx prisma migrate deploy

# 2. Data
mysql -uindobraga -p -h127.0.0.1 indobraga_legacy_baseline < analysis/000-legacy-inventory/synthetic-dataset/dataset.sql
```

Saat menjalankan legacy terhadap DB ini, override env agar tidak ada panggilan layanan nyata:
`STORAGE_DRIVER=local`, `EMAIL_PROVIDER_MODE=mock`, `NOTIFICATION_EMAIL_ENABLED=false`,
`EMAIL_WORKER_POLL_MS=0`, port API/web selain 3001/8080.
