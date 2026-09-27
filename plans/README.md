# Rencana Revamp Indobraga — Indeks

> **PENUNDAAN TESTING — keputusan owner 2026-09-27.** Seluruh pekerjaan pengujian ditunda di
> semua plan: menulis/menjalankan test unit, komponen, page, kontrak (validasi mock), E2E,
> visual regression, aksesibilitas otomatis, coverage gate, load/performance test, security scan
> dinamis, skenario INT, dan verifikasi berbasis test. Butir checklist/DoD yang mensyaratkan test
> **bukan syarat selesai** sampai owner mengaktifkannya kembali. Pemeriksaan statis tetap wajib
> karena bukan pengujian: typecheck, lint, format, build, lint & mapping kontrak, `go vet`,
> `golangci-lint`, `govulncheck`. Test yang sudah ada dibiarkan di repo, tidak dijalankan di CI.

Revamp `indobraga` (NestJS 11 + Prisma 7 + TanStack Start SSR, VPS legacy) menjadi
`indobraga-revamp`: monorepo **Dimas Monorepo Standard** dengan backend **Go modular monolith**,
frontend **React 19 SPA**, satu container Docker, MySQL di host, di **VPS baru**, sebagai **repo git
sendiri**.

Dasar analisis: [`analysis/000-legacy-inventory/`](../analysis/000-legacy-inventory/analysis.md)
(inventaris [backend](../analysis/000-legacy-inventory/backend.md) dan
[frontend](../analysis/000-legacy-inventory/frontend.md) legacy).

## Lima plan

| # | Plan | Hasil akhir (exit) | Bergantung pada |
|---|---|---|---|
| 1 | [PLAN-01 — Fondasi project](PLAN-01-setup-fondasi.md) | Repo sesuai standar, toolchain jalan, `knowledge/` + ADR lengkap, **kontrak API v1** final, **baseline legacy** terekam, CI dasar hijau | – |
| 2 | [PLAN-02 — Revamp frontend](PLAN-02-frontend.md) | `apps/web` SPA dengan paritas visual & perilaku terhadap legacy, berjalan di atas mock kontrak, semua test hijau | 1 |
| 3 | [PLAN-03 — Revamp backend](PLAN-03-backend.md) | `apps/api` Go memenuhi seluruh kontrak (160 endpoint + worker + SSE + SPA shell), skema DB baru, semua test hijau | 1 (paralel dengan 2 dimungkinkan, tapi urutan resmi 2 → 3) |
| 4 | [PLAN-04 — Integrasi & kesiapan produksi](PLAN-04-integrasi.md) | Frontend ↔ backend nyata tanpa mock, E2E penuh hijau, performa ≥ baseline, keamanan terverifikasi, staging di VPS baru, CI/CD, UAT lulus | 2, 3 |
| 5 | [PLAN-05 — Migrasi data & cutover](PLAN-05-migrasi-data.md) | Data legacy pindah ke skema baru dengan verifikasi berlapis, cutover DNS ke VPS baru, rollback teruji, legacy dipensiunkan | 3 (desain ETL), 4 (rehearsal di staging) |

```
PLAN-01 ──► PLAN-02 ──┐
    │                 ├──► PLAN-04 ──► PLAN-05 (cutover)
    └─────► PLAN-03 ──┘         ▲
                 └── desain ETL PLAN-05 (mulai setelah skema PLAN-03 dibekukan)
```

## Prinsip yang berlaku di semua plan

1. **Paritas dari sudut pandang user.** Pengunjung dan admin tidak boleh merasakan perbedaan
   tampilan, alur, data, atau URL. Struktur internal (kode, skema, format API) boleh berubah.
2. **Standar monorepo dipatuhi.** Deviasi hanya lewat ADR di `knowledge/decisions/`.
3. **Kontrak dulu.** `packages/api-contract/openapi.yaml` adalah sumber kebenaran antarmuka.
   Frontend dan backend sama-sama diuji terhadap kontrak ini. Perubahan kontrak → update kontrak
   dulu, regenerate tipe, baru kode.
4. **Ideal tetapi tercatat.** Setiap perbaikan yang mengubah perilaku legacy wajib punya ID `BC-xx`
   di daftar di bawah dan di ADR-0012. Tidak ada perubahan perilaku diam-diam.
5. **Test adalah bukti** _(ditunda — lihat PENUNDAAN TESTING di atas)_. "Selesai" = test otomatis hijau + checklist DoD plan terpenuhi, bukan
   "sudah dicoba manual".
6. **Legacy read-only.** Repo, server, dan database legacy tidak diubah sampai cutover (PLAN-05),
   kecuali langkah housekeeping git di PLAN-01 §1.0.
7. **Data pribadi dilindungi.** Dump produksi (berisi nama, email, telepon) tidak pernah masuk
   repo; fixture di repo hanya konten publik atau data sintetis.
8. **Dokumentasi library terbaru.** Sebelum memakai library/CLI/API, ambil dokumentasinya via
   Context7 (harus diotorisasi dulu lewat `/mcp` di sesi `claude` interaktif).

## Keputusan terkunci

| Topik | Keputusan | ADR (dibuat di PLAN-01) |
|---|---|---|
| Struktur | Dimas Monorepo Standard, backend `go` | ADR-0001..0003 (dari scaffold) |
| Format API | Envelope standar (`success`, `message`, `data`, `meta`) + ekstensi `code` & `request_id` pada error; path legacy dipertahankan | ADR-0004 |
| SEO | SPA + Go menyisipkan head (title, meta, OG, canonical, JSON-LD), bootstrap data, preload LCP per route; snapshot HTML sebagai cadangan | ADR-0005 |
| Auth | Cookie session (HMAC token di DB) + CSRF double-submit, bukan JWT | ADR-0006 |
| Database | Skema baru ideal; tanpa FK/join lintas modul; enum = string lowercase + CHECK; timestamp default DB; ID legacy dipertahankan | ADR-0007 |
| Media | Bucket S3 IDCloudHost yang sama; DB menyimpan object key, URL diturunkan dari `PUBLIC_MEDIA_URL`; pipeline gambar Go murni | ADR-0008 |
| Background job | Scheduler & event bus in-process, claim berbasis DB, tanpa Redis/queue | ADR-0009 |
| Desain | UI legacy = spesifikasi visual; skill `frontend-design` untuk celah (state baru) & review, bukan restyle | ADR-0010 |
| Test | Piramida test + contract test + visual regression terhadap baseline legacy | ADR-0011 |
| Perubahan perilaku | Daftar BC di bawah | ADR-0012 |
| Deploy | VPS baru, 1 container app, MySQL host, Nginx (TLS, SSE), CI/CD GitHub Actions | ADR-0013 |
| Migrasi data | ETL Go satu arah, idempotent, ID & timestamp dipertahankan, verifikasi 6 lapis | ADR-0014 (PLAN-05) |

## Daftar perubahan perilaku (BC) yang disetujui secara default

Backend:
- **BC-01** Access token Gmail di-refresh otomatis dengan refresh token; akun baru menjadi
  `needs_reconnect` hanya bila refresh gagal (mis. `invalid_grant`).
- **BC-02** Worker email notifikasi berjalan terjadwal di dalam aplikasi (tanpa cron eksternal),
  plus pemulihan job `processing` yang macet.
- **BC-03** Mode mock email juga berlaku untuk email notifikasi (dev/test tidak mengirim email nyata).
- **BC-04** Kode & pesan error domain dipertahankan (tidak dilebur menjadi pesan generik).
- **BC-05** Route arsip media tidak lagi berpotensi tertutup route arsip konten generik.
- **BC-06** Batas body JSON: 1 MB default; endpoint draft kampanye dinaikkan sesuai ukuran maksimum
  draft valid (1.000 penerima × variabel), dihitung dan dikunci di PLAN-03.
- **BC-07** Tidak ada kredensial hardcoded di seed maupun `.env.example`.
- **BC-08** Pembersihan berkala sesi kedaluwarsa dan OAuth state.
- **BC-09** Perbandingan constant-time untuk secret worker & token CSRF; CR/LF di header email
  notifikasi dibuang.
- **BC-10** `created_at`/`updated_at` punya default di level DB.
- **BC-11** Audit log mengisi `ip_hash` & `user_agent`; modul users ikut menulis audit.
- **BC-12** "Revalidation" (tabel event yang tidak memanggil apa pun) diganti invalidasi cache
  in-process berbasis event; field `pending_revalidation` di API dashboard dihapus (tidak tampil
  di UI).
- **BC-13** Nilai enum DB = nilai API (lowercase); `email_campaigns.name` → `title`; status
  `SENDING` → `processing`.
- **BC-14** Lebar/tinggi media yang disimpan = dimensi setelah orientasi EXIF (legacy menyimpan
  dimensi sebelum rotasi).
- **BC-15** Email via Gmail API dikirim sebagai multipart/alternative (teks + HTML), sama dengan SMTP
  (legacy membuang versi teks untuk Gmail).

Frontend:
- **BC-20** Tepat satu canonical per halaman publik; `/login` & `/admin*` noindex tanpa canonical.
- **BC-21** `seo_title`, `seo_description`, dan OG image dari Pengaturan admin menjadi default SEO situs.
- **BC-22** Route atau slug yang tidak ada → HTTP 404 sungguhan + halaman Not Found bergaya sama.
- **BC-23** Logo, nomor WhatsApp, dan kontak tersedia sejak paint pertama (tanpa lompatan logo).
- **BC-24** Preview HTML email dirender dalam iframe sandbox (script tidak dieksekusi).
- **BC-25** `/login` me-redirect user yang sudah login; setelah login kembali ke halaman tujuan.
- **BC-26** Data user (`me`) diambil sekali per sesi aplikasi, bukan per halaman.
- **BC-27** Input pencarian di top bar admin menjadi pencarian menu (memfilter link sidebar).
- **BC-28** Font Inter & Plus Jakarta Sans di-self-host (tampilan identik, tanpa request pihak ketiga).

Tambahan BC baru hanya lewat ADR-0012 dan harus disetujui Dimas.

## Backlog perbaikan (TIDAK dikerjakan tanpa persetujuan)

Kapabilitas yang ada di backend legacy tetapi tidak punya UI, atau peningkatan yang mengubah
pengalaman user — dicatat agar tidak hilang, bukan untuk dikerjakan dalam revamp ini:
UI manajemen audience + export CSV, UI reorder drag-and-drop, draft kampanye dari inquiry/audience,
tombol test SMTP, filter portofolio tersinkron ke URL, pagination di media library, emit notifikasi
`email_campaign_completed/failed`, `smtp_invalid`, `media_failed`, pembatalan kampanye, dark mode,
retry media yang benar-benar memproses ulang file.

## Cara menjalankan plan

- Satu plan dikerjakan sampai DoD-nya terpenuhi sebelum plan berikutnya dimulai (kecuali paralel
  yang disebut eksplisit).
- Setiap fase punya checklist `- [ ]`. Centang di file plan saat selesai, commit bersama kodenya.
- Di awal setiap sesi kerja: baca `CLAUDE.md`, file `knowledge/` yang relevan, dan bagian plan yang
  sedang dikerjakan.
- Requirement turunan yang butuh analisis mendalam → gunakan skill `monorepo-analyze` (hasil ke
  `analysis/<NNN>-<slug>/`).
- Setelah PLAN-05 selesai, folder `plans/` dipindah ke `analysis/001-revamp-plans/` dan dibekukan.

## Status

| Plan | Status | Mulai | Selesai |
|---|---|---|---|
| PLAN-01 | belum mulai | | |
| PLAN-02 | belum mulai | | |
| PLAN-03 | belum mulai | | |
| PLAN-04 | belum mulai | | |
| PLAN-05 | belum mulai | | |
