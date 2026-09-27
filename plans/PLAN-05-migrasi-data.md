# PLAN-05 — Migrasi Data & Cutover ke VPS Baru

> **PENUNDAAN TESTING — keputusan owner 2026-09-27.** Seluruh pekerjaan pengujian ditunda di
> semua plan: menulis/menjalankan test unit, komponen, page, kontrak (validasi mock), E2E,
> visual regression, aksesibilitas otomatis, coverage gate, load/performance test, security scan
> dinamis, skenario INT, dan verifikasi berbasis test. Butir checklist/DoD yang mensyaratkan test
> **bukan syarat selesai** sampai owner mengaktifkannya kembali. Pemeriksaan statis tetap wajib
> karena bukan pengujian: typecheck, lint, format, build, lint & mapping kontrak, `go vet`,
> `golangci-lint`, `govulncheck`. Test yang sudah ada dibiarkan di repo, tidak dijalankan di CI.
>
> ⚠️ Khusus PLAN-05: menunda verifikasi L1–L6 dan rehearsal berarti cutover produksi tidak
> terbukti aman. Rekomendasi: aktifkan kembali minimal L1 (jumlah baris) dan L2 (checksum isi)
> sebelum cutover sungguhan.

## Tujuan

Memindahkan **seluruh data produksi** dari database legacy (skema Prisma) ke skema baru
`indobraga-revamp` (PLAN-03 §3.3), lalu mengalihkan produksi ke VPS baru, dengan jaminan:

> Dari sudut pandang pengunjung maupun admin, **tidak ada yang berbeda**: URL, konten, gambar, urutan,
> nomor WhatsApp, akun & password admin, sesi login, daftar data & jumlahnya, notifikasi belum dibaca,
> akun email yang terhubung, template, riwayat kampanye, dan jejak audit — semuanya sama.

Struktur data boleh berubah (sudah dirancang di PLAN-03); yang dijaga adalah **makna dan tampilan**.

## Prasyarat

- [ ] DoD PLAN-04 terpenuhi (staging & wadah produksi siap di VPS baru, backup & monitoring aktif).
- [ ] `knowledge/DATABASE.md` sudah dibekukan (PLAN-03 fase B2) — desain ETL boleh dimulai sejak itu.
- [ ] Akses read-only ke database legacy produksi (user MySQL baru dengan hak `SELECT` + `LOCK TABLES`
      untuk dump) dan akses SSH ke VPS legacy.
- [ ] Nilai `SESSION_SECRET` legacy dan `CREDENTIAL_ENCRYPTION_KEY` legacy tersedia untuk proses
      migrasi (dipegang Dimas, ditransfer lewat kanal aman, tidak pernah di-commit).

## Prinsip

1. **Legacy adalah sumber tunggal dan tidak diubah** — ETL membaca dari dump yang di-restore ke DB
   impor terpisah di VPS baru, bukan langsung dari produksi legacy.
2. **ID dan timestamp dipertahankan** — URL admin, `resource_id` notifikasi & audit, urutan
   berdasarkan `created_at`/`published_at` tetap sama.
3. **Idempotent & bisa diulang** — setiap run mengosongkan target lalu memuat ulang; hasil deterministik.
4. **Tidak ada baris yang hilang diam-diam** — setiap baris yang ditolak/diubah tercatat di laporan
   dengan alasan; target 0 penolakan, penolakan hanya dengan persetujuan Dimas.
5. **Dibuktikan berlapis** (L1–L6, §5.6) sebelum DNS dialihkan.
6. **Data pribadi tetap di server** — dump, screenshot admin berisi data nyata, dan laporan berisi PII
   tidak pernah masuk repo atau mesin lain di luar yang disebut di plan ini.

---

## 5.1 ADR-0014 — Strategi migrasi data

- [ ] Tulis ADR-0014: ETL Go satu arah (`apps/api/cmd/legacy-migrate`), dump → DB impor → DB target,
      ID & timestamp dipertahankan, secret dienkripsi ulang dengan key baru, `SESSION_SECRET` legacy
      dipakai ulang agar sesi tetap valid, media tetap di bucket yang sama, verifikasi L1–L6, rehearsal
      ≥ 2×, rollback dengan reverse-delta dalam 72 jam.
- [ ] Pengecualian boundary yang disengaja: alat ETL adalah tooling operasional sekali pakai, boleh
      menulis tabel semua modul langsung lewat SQL sendiri (tidak mengimpor paket modul), tidak ikut
      dalam binary server, dan dibekukan setelah decommission.

## 5.2 Audit kualitas data legacy

Dijalankan pada dump terbaru (di DB impor di VPS baru), hasil ke laporan audit:

- [ ] Versi skema legacy = migration Prisma terakhir (`20260624000000_site_footer_logo_media`); bila
      berbeda, hentikan dan perbarui pemetaan.
- [ ] Jumlah baris per tabel (dibanding `db-stats.md` PLAN-01).
- [ ] Integritas: orphan (slide tanpa hero, gambar portofolio tanpa portofolio/media, penerima tanpa
      kampanye, read tanpa notifikasi), referensi media ke baris yang tidak ada.
- [ ] Nilai yang akan bermasalah di skema baru: `portfolios.category_id` null, `image_media_id` yang
      tidak ada di `portfolio_images`, konten berita bukan array string, slug tidak valid, email
      duplikat beda huruf besar/kecil di `users`/`marketing_contacts`, nilai enum di luar daftar.
- [ ] Status transien: kampanye `PENDING`/`SENDING`, penerima `SENDING`, job notifikasi
      `PENDING`/`PROCESSING`, media `PROCESSING`.
- [ ] Media: setiap object key (varian thumbnail/medium/large, video) dicek `HEAD` ke bucket; URL di DB
      = `PUBLIC_MEDIA_URL` + key; catat yang hilang.
- [ ] Setiap temuan diberi keputusan (perbaiki di transformasi / terima apa adanya / perbaiki manual di
      legacy sebelum cutover) dan dicatat di laporan.

## 5.3 Pemetaan tabel (31 tabel legacy)

| Legacy | Target (modul) | Transformasi |
|---|---|---|
| `users` | `users` (users) | role & status → lowercase; `password_hash` apa adanya (bcrypt kompatibel) |
| `admin_sessions` | `admin_sessions` (auth) | hanya sesi belum dicabut & belum kedaluwarsa; `token_hash` apa adanya (valid karena `SESSION_SECRET` dipakai ulang) |
| `audit_logs` | `audit_logs` (audit) | apa adanya; `ip_hash`/`user_agent` baris lama tetap null |
| `site_settings` | `site_settings` (settings) | apa adanya; 4 ID media tetap |
| `hero_sections`, `hero_slides`, `partners`, `production_strengths`, `machines`, `printing_capacities`, `production_capacities`, `services` | tabel sama (profile) | `status`, `previous_status` → lowercase; ID media tetap |
| `portfolio_categories` | sama (portfolio) | status lowercase |
| `portfolios` | `portfolios` (portfolio) | buang kolom teks `category` (pastikan `category_id` terisi: null → cari kategori dari teks, gagal → laporan); buang `image_media_id` setelah memastikan media itu adalah gambar urutan pertama di `portfolio_images` (bila tidak ada → sisipkan sebagai urutan 0) sehingga cover identik |
| `portfolio_images` | sama (portfolio) | apa adanya, urutan dinormalisasi bila perlu |
| `gallery_items` | sama (gallery) | `type`, status lowercase |
| `news` | sama (news) | status lowercase; `content` divalidasi array string |
| `inquiries`, `whatsapp_leads` | sama (leads) | status lowercase; `meta` apa adanya |
| `media_files` | `media_files` + `media_variants` (media) | `object_key` → `storage_key`; JSON `variants` → baris `media_variants` (thumbnail/medium/large + key + bytes) dan kolom `usage`/`alt_text`/`caption`; kolom URL dibuang setelah diverifikasi = `PUBLIC_MEDIA_URL` + key; lebar/tinggi dihitung ulang dari header varian large (range GET) untuk BC-14; kind & status lowercase |
| `email_accounts` | `email_accounts` (emailaccounts) | provider `GOOGLE_OAUTH`→`google`, `SMTP_HOSTING`→`smtp`; status & `smtp_security` lowercase; password SMTP & token Google **didekripsi key legacy lalu dienkripsi key baru** |
| `email_oauth_states` | – | tidak dimigrasi (sementara, berlaku 10 menit) |
| `marketing_contacts` | sama (audience) | enum lowercase; kolom `tags` dibuang (tidak pernah dipakai) |
| `email_campaigns` | sama (campaigns) | `name` → `title`; status `SENDING` → `processing`, lainnya lowercase; `locked_at` null |
| `email_campaign_recipients` | sama (campaigns) | status lowercase; `locked_at` null; `sending` → `queued` (seharusnya 0 setelah pre-check) |
| `email_send_logs` | sama (campaigns) | apa adanya |
| `email_templates` | sama (emailtemplates) | `content_mode` lowercase |
| `revalidation_events` | – | tidak dimigrasi (BC-12, tanpa efek ke user) |
| `notifications` | sama (notifications) | type & severity lowercase |
| `notification_reads` | sama (notifications) | apa adanya (jumlah belum dibaca per user identik) |
| `notification_email_jobs` | sama (notifications) | status lowercase; `processing` → `pending` |
| `_prisma_migrations` | – | diganti `schema_migrations` golang-migrate |

- [ ] Setiap baris tabel di atas punya test unit transformasi (input legacy → output baru).

## 5.4 Alat ETL `apps/api/cmd/legacy-migrate`

- [ ] Perintah: `preflight`, `audit`, `run` (`--dry-run`), `verify`, `reverse-delta --since=<ts>`.
- [ ] `preflight`: versi skema legacy benar, target sudah `migrate up` ke versi terbaru dan kosong,
      key enkripsi lama & baru tersedia dan valid (uji dekripsi satu baris), koneksi bucket OK.
- [ ] `run`: urutan per modul mengikuti dependensi (users → auth → audit → media → settings → profile →
      portfolio → gallery → news → leads → audience → emailaccounts → emailtemplates → campaigns →
      notifications); insert dengan ID eksplisit; batch per 1.000 baris; transaksi per tabel;
      setelah selesai `AUTO_INCREMENT` diset ke `MAX(id)+1` dan diverifikasi.
- [ ] Laporan `report.json` + `report.md`: jumlah sumber/target per tabel, transformasi yang terjadi,
      peringatan, baris ditolak + alasan, durasi per tahap. Disimpan di server, tidak di-commit.
- [ ] Deterministik: dua run pada dump yang sama menghasilkan checksum target yang identik.
- [ ] `reverse-delta`: mengekspor baris yang dibuat/diubah di sistem baru setelah `--since` (inquiry,
      prospek WhatsApp, kontak audience, notifikasi & read, audit, perubahan konten & media, user,
      kampanye) kembali ke skema legacy — hanya untuk rollback (§5.9), diuji di rehearsal.
- [ ] Test: unit per transformasi, integrasi end-to-end memakai dataset sintetis versi skema legacy
      (PLAN-01) → skema baru, lalu dibandingkan dengan `apps/api/testdata/synthetic/` (harus identik).

## 5.5 Media, secret, sesi

- [ ] **Media**: bucket & prefix sama (`upload/prod/...`), `PUBLIC_MEDIA_URL` sama → URL gambar di halaman
      identik; tidak ada penyalinan objek. Objek yang hilang (§5.2) dilaporkan; perilaku tampil sama
      dengan legacy (legacy pun sudah rusak untuk objek itu) kecuali Dimas memutuskan mengunggah ulang.
- [ ] Kredensial S3: aplikasi baru memakai access key baru; key legacy dicabut saat decommission.
- [ ] **`SESSION_SECRET`** produksi baru = nilai legacy → sesi yang dimigrasi tetap valid; nama cookie
      sesi & CSRF sama; domain sama → admin yang sedang login **tetap login** setelah cutover.
- [ ] **`CREDENTIAL_ENCRYPTION_KEY`** baru (rotasi); ETL mengenkripsi ulang semua secret.
- [ ] `INTERNAL_WORKER_SECRET` baru.
- [ ] Google OAuth: client ID/secret sama, redirect URI (domain + path) sama → tidak ada perubahan di
      Google Cloud Console untuk produksi.
- [ ] Akun Gmail yang refresh token-nya valid langsung mendapat manfaat BC-01; yang refresh token-nya
      tidak valid ditandai di laporan (admin perlu reconnect — sama seperti kondisi legacy saat ini).

## 5.6 Verifikasi berlapis

| Lapis | Apa | Cara | Lulus bila |
|---|---|---|---|
| L1 Jumlah | baris per tabel | SQL di DB impor vs target | sama, kecuali pengurangan yang terdokumentasi (sesi kedaluwarsa, OAuth state, revalidation) |
| L2 Isi | setiap baris, field yang dipetakan | checksum per baris dari representasi kanonik di kedua sisi | 100% cocok |
| L3 API | semua endpoint publik (setiap halaman, cursor, kategori, slug berita) dan semua list/detail admin setiap resource & halaman | `scripts/parity/compare-api.mjs`: ambil dari legacy & baru, normalisasi perbedaan envelope sesuai `LEGACY_MAPPING.md`, bandingkan field yang terlihat user | 0 selisih |
| L4 Visual | seluruh URL di `url-inventory.txt` + state modal/lightbox + halaman admin utama | Playwright screenshot legacy vs baru dengan data produksi yang sama | 0 selisih yang tidak dijelaskan BC |
| L5 Fungsional | login akun yang ada, sesi yang ada tetap berlaku, akun SMTP/Gmail connected + kirim uji, jumlah notifikasi belum dibaca per user, total dashboard, riwayat kampanye, export CSV audience | skrip + checklist manual Dimas | semua cocok |
| L6 SEO & URL | himpunan URL sitemap, robots, head setiap URL publik, JSON-LD | skrip terhadap `seo-baseline.json` & `url-inventory.txt` | identik kecuali BC-20/21/22 yang tercatat |

Cara membandingkan admin tanpa memasukkan password oleh Claude: Dimas login sendiri ke legacy di
browser yang dikendalikan Playwright, storage state disimpan lokal di luar repo; karena sesi
dimigrasi dan `SESSION_SECRET` sama, cookie yang sama berlaku di sistem baru. Screenshot admin (berisi
data nyata) disimpan di luar repo dan dihapus setelah decommission. Perbandingan dijalankan segera
setelah dump; baris yang dibuat di legacy setelah waktu dump (`created_at`) dikecualikan, dan baris
yang diubah setelah dump (`updated_at`) dilaporkan sebagai selisih yang dijelaskan, bukan kegagalan.
Saat cutover sungguhan, legacy sudah read-only sehingga pengecualian ini tidak diperlukan.

## 5.7 Rehearsal

Dilakukan di VPS baru pada database terisolasi (`indobraga_rehearsal_import`, `indobraga_rehearsal`)
dan container staging yang diarahkan ke DB rehearsal.

- [ ] **R1**: dump produksi terbaru → audit (§5.2) → `run` → L1–L6. Catat durasi setiap tahap, perbaiki
      pemetaan, ulangi sampai lulus.
- [ ] **R2** (≥ 7 hari sebelum cutover): run bersih dari awal, **semua L1–L6 lulus tanpa intervensi**,
      durasi total terukur (target jendela maintenance ≤ 60 menit dengan margin 2×).
- [ ] **Uji rollback** di R2: buat data baru di sistem baru → `reverse-delta` → data muncul di salinan
      legacy dengan benar.
- [ ] **R3** (H-1): run bersih terakhir dengan dump terbaru; hasil sama dengan R2.
- [ ] Kriteria go/no-go ditulis sebelum R2 dan disetujui Dimas.

## 5.8 Runbook cutover

| Waktu | Langkah |
|---|---|
| H-14 | Catat nilai DNS saat ini; turunkan TTL record A/AAAA apex & `www` ke 300 dtk. **Jangan sentuh MX, TXT (SPF/DKIM/DMARC, verifikasi), dan record email lain.** |
| H-7 | R2 lulus; code freeze revamp (kecuali blocker) dan legacy. |
| H-2 | TLS produksi di VPS baru siap (sertifikat saat ini disalin aman dari VPS legacy, atau diterbitkan via DNS-01); env produksi final; DB produksi termigrasi & kosong; backup aktif. |
| H-1 | R3 lulus; admin diberi tahu jendela maintenance (jam sepi, mis. malam akhir pekan, ≤ 60 menit). |
| T+0:00 | Pre-check di legacy: tidak ada kampanye `PENDING`/`SENDING`, tidak ada job notifikasi pending, tidak ada media `PROCESSING`. Bila ada → tunggu selesai atau tunda. |
| T+0:05 | Legacy **read-only**: Nginx legacy mengembalikan 503 (JSON maintenance berbahasa Indonesia) untuk semua request non-GET ke `/api/`; halaman publik tetap bisa dibaca. |
| T+0:10 | Dump final legacy (`mysqldump --single-transaction --routines --triggers`) + checksum; salin ke VPS baru lewat SSH; salinan tetap disimpan di legacy. |
| T+0:15 | Restore ke DB impor; `preflight` → `run` → laporan. |
| T+0:30 | Verifikasi otomatis L1, L2, L6 (sitemap/robots), L3 publik terhadap produksi baru via `curl --resolve` / hosts file (DNS belum pindah). |
| T+0:40 | UAT cepat Dimas via hosts file: login dengan akunnya, cek sesi, dashboard, satu halaman per modul. |
| T+0:45 | **Go/no-go.** No-go → rollback sebelum titik tanpa kembali (§5.9). |
| T+0:50 | Alihkan record A/AAAA apex & `www` ke IP VPS baru. |
| T+0:52 | Nginx legacy diubah menjadi reverse proxy ke VPS baru (HTTPS + SNI) agar resolver DNS yang masih lama tetap sampai ke sistem baru; hentikan proses PM2 legacy (API & web) sehingga tidak ada lagi tulisan ke DB legacy. |
| T+1:00 | Smoke test produksi (read-only) + L4 sampel; pantau log & error rate intensif 2 jam. |
| H+1 | Search Console: kirim ulang sitemap, pantau coverage; cek akun email connected & worker; cek backup harian pertama. |
| H+1..H+3 | Pantau: error 5xx, latensi, SSE, worker, email terkirim, trafik yang masih lewat proxy legacy. |
| H+3 | Titik tanpa kembali resmi bila tidak ada P0/P1: `reverse-delta` dipensiunkan. |
| H+14 | Decommission (§5.10). |

## 5.9 Rollback

- **Sebelum T+0:50 (DNS belum pindah):** batalkan → cabut mode read-only legacy → sistem legacy
  berjalan seperti biasa. Tidak ada data hilang karena legacy tidak pernah ditulis sistem baru.
- **Setelah DNS pindah, sampai H+3:** bila ada P0 yang tidak bisa diperbaiki dalam 1 jam:
  1. Sistem baru ke mode read-only (tulis → 503).
  2. `reverse-delta --since=<waktu cutover>` → impor ke DB legacy (sudah diuji di R2).
  3. Kembalikan DNS ke IP legacy; Nginx VPS baru mem-proxy ke legacy selama propagasi; nyalakan PM2
     legacy; cabut read-only legacy.
  4. Verifikasi L1 untuk tabel yang terdampak delta; post-mortem sebelum mencoba cutover lagi.
- Kompatibilitas kripto dua arah (PLAN-03 §3.12) memastikan akun email & sesi tetap bisa dipakai
  setelah rollback.

## 5.10 Decommission legacy (H+14)

- [ ] Log Nginx legacy menunjukkan trafik proxy ≈ 0 selama ≥ 3 hari.
- [ ] Dump final legacy diarsipkan terenkripsi di penyimpanan offsite; lokasi & cara dekripsi dicatat
      di `knowledge/DEPLOYMENT.md`.
- [ ] VPS legacy dimatikan; access key S3 legacy dicabut; secret legacy yang tidak dipakai lagi dirotasi.
- [ ] Repo GitHub legacy di-archive (read-only).
- [ ] Hapus semua dump, DB impor/rehearsal, storage state browser, dan screenshot berisi data nyata di
      VPS baru & mesin dev.
- [ ] Pindahkan `plans/` ke `analysis/001-revamp-plans/` (dibekukan); `CLAUDE.md` & `knowledge/`
      tidak lagi merujuk ke legacy kecuali sebagai sejarah.

## Checklist "tidak ada yang berbeda" (diterima Dimas)

Pengunjung:
- [ ] Semua URL lama bekerja; tidak ada redirect baru yang tidak perlu.
- [ ] Konten, urutan, gambar, kategori, dan jumlah item setiap halaman sama.
- [ ] Nomor WhatsApp, kontak, alamat, logo sama; form kontak & WhatsApp berfungsi.
- [ ] Preview tautan di WhatsApp/Facebook sama.

Admin:
- [ ] Akun & password sama; yang sedang login tetap login.
- [ ] Setiap daftar (konten, media, leads, akun email, template, kampanye, user) berisi data & jumlah
      yang sama, dengan status yang sama.
- [ ] Notifikasi belum dibaca per user sama.
- [ ] Akun email yang connected tetap connected; kirim uji berhasil.
- [ ] Riwayat kampanye, penerima, dan log sama; jejak audit utuh.
- [ ] Angka dashboard sama.

## Definition of Done

- [ ] ADR-0014 disetujui; alat ETL + test lulus.
- [ ] R2 & R3 lulus L1–L6 tanpa intervensi; rollback teruji.
- [ ] Cutover dilakukan sesuai runbook; L1–L6 produksi lulus; checklist "tidak ada yang berbeda"
      diterima Dimas.
- [ ] 72 jam pasca-cutover tanpa P0/P1; titik tanpa kembali dinyatakan.
- [ ] Decommission selesai; data pribadi sementara terhapus; `plans/` dibekukan ke `analysis/`.
- [ ] Status di `plans/README.md` ditandai selesai untuk kelima plan.

## Risiko & mitigasi

| Risiko | Mitigasi |
|---|---|
| Data berubah di legacy setelah dump final | Mode read-only legacy sebelum dump final; proxy + stop PM2 setelah switch |
| Jendela maintenance molor | Durasi diukur di R2 dengan margin 2×; go/no-go berbasis waktu |
| Secret legacy salah/tidak tersedia | `preflight` menguji dekripsi sebelum `run`; tanpa lulus preflight tidak ada cutover |
| Objek media hilang di bucket | Terdeteksi di audit §5.2 dan diputuskan sebelum cutover |
| DNS lama tersimpan di resolver | TTL 300 dtk sejak H-14 + reverse proxy di VPS legacy |
| Record email ikut terubah | Hanya A/AAAA apex & `www` yang disentuh; nilai lama dicatat di H-14 |
| Bug kritis setelah cutover | Rollback reverse-delta teruji (≤ H+3), monitoring intensif, on-call Dimas |
| Kebocoran PII dari artefak migrasi | Semua artefak di server/luar repo, dihapus saat decommission |
