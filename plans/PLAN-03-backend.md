# PLAN-03 — Revamp Backend (`apps/api`, Go Modular Monolith)

> **PENUNDAAN TESTING — keputusan owner 2026-09-27.** Seluruh pekerjaan pengujian ditunda di
> semua plan: menulis/menjalankan test unit, komponen, page, kontrak (validasi mock), E2E,
> visual regression, aksesibilitas otomatis, coverage gate, load/performance test, security scan
> dinamis, skenario INT, dan verifikasi berbasis test. Butir checklist/DoD yang mensyaratkan test
> **bukan syarat selesai** sampai owner mengaktifkannya kembali. Pemeriksaan statis tetap wajib
> karena bukan pengujian: typecheck, lint, format, build, lint & mapping kontrak, `go vet`,
> `golangci-lint`, `govulncheck`. Test yang sudah ada dibiarkan di repo, tidak dijalankan di CI.

## Tujuan

Menulis ulang seluruh backend NestJS legacy dalam Go sesuai Dimas Monorepo Standard (Air,
golang-migrate, sqlc + `database/sql`, modul dengan `contracts/` sebagai satu-satunya boundary
publik) sehingga:

- **Semua 160 endpoint** di kontrak v1 terimplementasi dan lulus contract test.
- Semua perilaku bisnis legacy (inventaris `analysis/000-legacy-inventory/backend.md`) dipertahankan,
  ditambah perbaikan BC-01..BC-15.
- Worker kampanye email, worker email notifikasi, SSE, pipeline media, OAuth Gmail, SMTP berjalan
  dan teruji.
- Go juga menyajikan SPA (shell + SEO head + bootstrap, ADR-0005), `robots.txt`, `sitemap.xml`.
- Skema database baru yang ideal (ADR-0007) siap menjadi target migrasi data PLAN-05.

**Di luar lingkup:** perubahan UI (PLAN-02), deploy VPS (PLAN-04), migrasi data (PLAN-05).

## Prasyarat

- [ ] DoD PLAN-01 terpenuhi (kontrak v1, ADR, toolchain Go, DB lokal dev & test).
- [ ] Urutan resmi: PLAN-02 selesai dulu. Fase B1–B2 boleh dimulai paralel dengan PLAN-02 bila
      kontrak sudah dibekukan.
- [ ] Sebelum mengerjakan tiap modul: **baca kode legacy modul tersebut** (service, controller, DTO,
      spec) — inventaris adalah peta, bukan pengganti kode.

---

## 3.1 Peta modul

Struktur setiap modul mengikuti standar:
`internal/modules/<m>/{contracts, application, domain/events, infrastructure/{queries,sqlc,repository.go}, presentation, <m>.module.go}`.

| Modul | Tanggung jawab | Tabel milik | Contract yang disediakan | Mengonsumsi | Integrasi eksternal |
|---|---|---|---|---|---|
| `auth` | login/logout/me, sesi, CSRF, guard permission | `admin_sessions` | `Authenticator` (middleware sesi & permission), `Permission` + peta role | users | – |
| `users` | manajemen user, kredensial | `users` | `UserClient` (GetByID, GetMany, VerifyCredentials, TouchLastLogin); event `user.deactivated`, `user.password_changed` | audit | – |
| `audit` | pencatatan audit | `audit_logs` | `AuditClient.Record` | – | – |
| `media` | upload, pipeline gambar, arsip/hapus, referensi | `media_files`, `media_variants` | `MediaClient` (GetPreviews, EnsureCompleted, DeleteIfUnused, PingStorage); interface `ReferenceProvider` + registrasi | audit | S3 IDCloudHost |
| `settings` | pengaturan situs (singleton) | `site_settings` | `SettingsClient` (Get, WhatsAppNumber, ContactEmail, SeoDefaults) | media, audit | – |
| `profile` | hero, slide, partner, keunggulan, mesin, kapasitas cetak & produksi, layanan | `hero_sections`, `hero_slides`, `partners`, `production_strengths`, `machines`, `printing_capacities`, `production_capacities`, `services` | `ProfileClient` (HomeBlocks, FacilitiesBlocks) | media, audit | – |
| `portfolio` | kategori, portofolio, galeri gambar portofolio | `portfolio_categories`, `portfolios`, `portfolio_images` | `PortfolioClient` (Featured, Counts) | media, audit | – |
| `gallery` | item galeri | `gallery_items` | `GalleryClient` (Counts) | media, audit | – |
| `news` | berita | `news` | `NewsClient` (Latest, BySlugForSeo, SitemapEntries, Counts) | media, audit | – |
| `site` | orkestrasi publik: home, fasilitas, SEO, robots, sitemap, SPA shell, cache publik | – | – | settings, profile, portfolio, gallery, news, media | – |
| `leads` | pesan kontak, prospek WhatsApp | `inquiries`, `whatsapp_leads` | `LeadClient` (InquiryRecipients, Counts, Latest); event `inquiry.created`, `whatsapp_lead.created` | settings, audit, event notifikasi | – |
| `audience` | kontak marketing | `marketing_contacts` | `AudienceClient` (EligibleRecipients, Preview) | event leads | – |
| `notifications` | notifikasi, status baca, email notifikasi, SSE | `notifications`, `notification_reads`, `notification_email_jobs` | event `notification_email.finished` | leads (event), settings, emailaccounts | – |
| `emailaccounts` | akun Google & SMTP, OAuth, pengiriman | `email_accounts`, `email_oauth_states` | `AccountClient` (Sender, MarkNeedsReconnect, NotificationSender); interface `UsageChecker` + registrasi | audit | Google OAuth, Gmail API, SMTP |
| `emailtemplates` | template email | `email_templates` | – | audit | – |
| `campaigns` | kampanye, penerima, log kirim, worker | `email_campaigns`, `email_campaign_recipients`, `email_send_logs` | `CampaignClient` (Counts, Latest); implementasi `UsageChecker` | emailaccounts, leads, audience, audit | – |
| `dashboard` | ringkasan admin | – | – | leads, gallery, news, portfolio, media, emailaccounts, campaigns | – |
| `health` | health check | – | – | media (PingStorage) | – |

Pemutus dependensi melingkar (Go menolak import cycle):
- media ↔ modul konten: `media/contracts.ReferenceProvider` diimplementasikan settings/profile/
  portfolio/gallery/news, didaftarkan saat wiring.
- users ↔ auth: pencabutan sesi lewat event `user.*` yang di-subscribe auth.
- leads ↔ notifications: status notifikasi inquiry lewat event `notification_email.finished`.
- emailaccounts ↔ campaigns: cek "akun dipakai kampanye" lewat `emailaccounts/contracts.UsageChecker`.

Wiring semua modul, registrasi provider, dan subscriber event ada di satu tempat:
`internal/app/wire.go` (dipanggil `cmd/server/main.go`).

- [ ] Tabel di atas disalin ke `knowledge/MODULE_MAP.md` sebagai versi final.

## 3.2 Platform & cross-cutting (`internal/{config,database,server,router,shared}`)

- [ ] **Config**: parse + validasi env saat boot (gagal cepat). Aturan produksi legacy dipertahankan:
      secret tidak boleh diawali `development-`/`replace-with`, driver storage wajib `s3`,
      `MEDIA_STORAGE_ENV ≠ dev`, variabel S3 & URL endpoint valid wajib bila driver `s3`.
- [ ] **HTTP server**: `net/http` + `ServeMux` pola method/wildcard; `ReadHeaderTimeout`,
      `ReadTimeout`, `WriteTimeout`, `IdleTimeout`, `MaxHeaderBytes`; SSE & upload memperpanjang
      deadline lewat `http.ResponseController`. Graceful shutdown (§3.11).
- [ ] **Urutan middleware**: recover → request-id → real IP (`TRUSTED_PROXIES`, hop pertama
      `X-Forwarded-For` hanya dari proxy tepercaya) → access log → security headers → rate limit →
      body limit → sesi (auth) → CSRF → handler (cek permission per route).
- [ ] **Request ID**: terima `X-Request-Id` masuk bila cocok `^[A-Za-z0-9_.:-]{8,128}$`, selain itu
      `req_<uuid>`; selalu di header respons dan di body error.
- [ ] **Security headers** API setara default helmet v8 (HSTS 1 tahun + includeSubDomains,
      `X-Frame-Options: SAMEORIGIN`, `Cross-Origin-Resource-Policy: same-origin`, COOP,
      `Referrer-Policy: no-referrer`, `nosniff`, tanpa `X-Powered-By`, CSP untuk API). Header shell
      HTML di §3.9.
- [ ] **Rate limit** per IP (in-memory, token bucket): default 120/60 dtk; login 5/60 dtk; inquiry &
      WhatsApp lead publik 10/60 dtk; SSE dikecualikan. Header `X-RateLimit-Limit/Remaining/Reset`,
      `Retry-After`; 429 `RATE_LIMITED`.
- [ ] **Body limit**: JSON 1 MB default; endpoint draft kampanye dihitung dari ukuran maksimum valid
      (1.000 penerima × 50 variabel × 2.000 karakter dibatasi validasi) lalu dikunci di kontrak (BC-06);
      multipart media 100 MB.
- [ ] **Envelope & error** sesuai ADR-0004. Error code: `BAD_REQUEST`, `VALIDATION_ERROR`,
      `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `PAYLOAD_TOO_LARGE`,
      `UNSUPPORTED_MEDIA_TYPE`, `UNPROCESSABLE_ENTITY`, `RATE_LIMITED`, `INTERNAL_ERROR`,
      `UPSTREAM_ERROR`, `SERVICE_UNAVAILABLE` + kode domain (BC-04). Pesan default Indonesia per kode;
      pesan domain dipertahankan. Error non-HTTP → 500 `INTERNAL_ERROR` + log.
- [ ] **Validasi**: field tak dikenal ditolak (setara `forbidNonWhitelisted`), konversi implisit
      query, error 400 `VALIDATION_ERROR` "Periksa kembali data yang diisi." + `errors[{field, message}]`
      dengan path bertitik dan label field Indonesia (port peta label legacy).
- [ ] **Pagination**: offset (page default 1, nilai invalid → default, limit di-clamp per endpoint,
      `total_pages = max(1, ceil(total/limit))`); cursor base64url JSON `{sort_order, id}` dengan
      `limit+1`.
- [ ] **Cache-Control** per kategori route: `no-store` untuk auth, admin, health, leads, internal;
      list publik `public, max-age=60, stale-while-revalidate=300`; detail publik & SEO
      `public, max-age=300, stale-while-revalidate=600`.
- [ ] **Database**: `go-sql-driver/mysql`, DSN `parseTime=true&loc=UTC&charset=utf8mb4&collation=utf8mb4_unicode_ci`;
      pool `MaxOpenConns 10`, `ConnMaxLifetime` < `wait_timeout` server, `ConnMaxIdleTime`;
      reconnect otomatis (menggantikan hack systemd legacy yang me-restart API setelah MySQL restart).
      Helper transaksi per modul.
- [ ] **Shared utilities** (teknis saja, tanpa aturan bisnis): `errors`, `response`, `validator`,
      `pagination`, `logger` (slog JSON), `clock` (bisa dipalsukan di test), `crypto` (AES-256-GCM
      format `v1:<iv>:<tag>:<ct>` base64url kompatibel legacy, HMAC-SHA256, sha256, compare
      constant-time), `events` (bus in-process bertipe, publish setelah commit, error handler dicatat),
      `scheduler` (job ber-ticker, single-flight, re-arm, stop via context), `slug` (algoritma identik
      legacy: lowercase, non-alfanumerik → `-`, trim, fallback `konten-<ms>`), `crudkit` (mekanik
      generik status/arsip/reorder/published_at tanpa pengetahuan domain), `htmltext` (escape,
      deteksi teks terlihat), `mailmsg` (builder RFC 5322, sanitasi header).
- [ ] **Architecture test** (`internal/archtest`): gagal bila paket di modul A mengimpor paket modul B
      selain `B/contracts`, bila `contracts` mengimpor `application`/`infrastructure` mana pun, atau
      bila `shared` mengimpor modul. Juga memastikan `sqlc.yaml` punya blok `sql:` untuk setiap modul
      yang punya folder `queries/`.

## 3.3 Skema database baru

Konvensi ADR-0007. Satu set migration golang-migrate, file per modul berurutan
(`000001_users.up.sql`, `000002_auth.up.sql`, …), setiap `up` punya `down` yang teruji.

Perubahan dibanding legacy (dari sudut pandang user tidak ada yang berubah):

| Area | Legacy | Baru | Alasan |
|---|---|---|---|
| Semua tabel | ENUM MySQL uppercase; mapping ke lowercase di API | `VARCHAR(32)` + `CHECK`, nilai = nilai API lowercase | tanpa lapisan mapping; migrasi enum tanpa `ALTER ENUM` (BC-13) |
| Semua tabel | `updated_at` tanpa default | `created_at DEFAULT CURRENT_TIMESTAMP(3)`, `updated_at … ON UPDATE CURRENT_TIMESTAMP(3)` | BC-10 |
| FK lintas modul (±22, mis. konten → `media_files`, apa pun → `users`, kampanye → `email_accounts`, penerima → `marketing_contacts`) | FK fisik | ID primitif + index; aturan (blok hapus bila dipakai, dsb.) di aplikasi | standar modular monolith |
| `media_files` | 6 kolom URL absolut + JSON `variants` + `checksum` tak terpakai | `storage_key` utama, kolom `usage`, `alt_text`, `caption`, `checksum_sha256` terisi; tabel baru `media_variants` (media_id FK intra-modul, `variant`, `storage_key` unik, lebar, tinggi, bytes, mime) | URL diturunkan dari `PUBLIC_MEDIA_URL` (ADR-0008); ganti CDN/bucket cukup ubah env |
| `portfolios` | kolom teks `category` (denormalisasi) + `image_media_id` (cover) + `category_id` nullable | hanya `category_id NOT NULL`; cover = gambar urutan pertama di `portfolio_images` | satu sumber kebenaran |
| `email_campaigns` | `name`, status `SENDING` | `title`, status `processing` | sesuai API (BC-13) |
| `email_accounts` | provider `GOOGLE_OAUTH`/`SMTP_HOSTING` | `google`/`smtp` | sesuai API |
| `marketing_contacts` | `tags` JSON tak terpakai | dihapus | kolom mati |
| `revalidation_events` | tabel event tanpa efek | dihapus | BC-12 |
| `audit_logs` | `ip_hash`, `user_agent` selalu kosong | terisi | BC-11 |

- [ ] Semua index legacy dipindah; index tambahan hanya bila ada pola query baru (divalidasi EXPLAIN
      di PLAN-04).
- [ ] Unique constraint legacy dipertahankan (email user, slug, `(provider, email)`,
      `(campaign_id, email)`, `(portfolio_id, media_file_id)`, `(notification_id, user_id)`,
      `token_hash`, `state_hash`, dst.).
- [ ] ID tetap `INT UNSIGNED AUTO_INCREMENT` agar ID legacy bisa dipertahankan saat migrasi.
- [ ] `knowledge/DATABASE.md` berisi DDL final per modul — **dibekukan** di akhir fase B2 dan menjadi
      input desain ETL PLAN-05.
- [ ] `sqlc.yaml`: satu blok `sql:` per modul (queries → `infrastructure/sqlc`); `sqlc diff` bersih.

## 3.4 Auth, users, audit

- [ ] Login: `POST /auth/login` (5/60 dtk, tanpa CSRF), bcrypt compare (hash legacy `$2a$/$2b$` valid),
      cookie sesi (token 32 byte base64url; DB menyimpan HMAC-SHA256 hex; httpOnly, SameSite=Lax,
      Secure di produksi, path `/`, maxAge = TTL) + cookie CSRF non-httpOnly, `last_login_at`,
      audit `auth.login`. Respons `{user:{id,name,email,role,permissions[]}}`.
- [ ] Logout (`revoked_at`, hapus kedua cookie, audit `auth.logout`), `GET /auth/me`.
- [ ] Middleware sesi: sesi valid bila tidak dicabut, belum kedaluwarsa, user aktif. Semua route
      `/api/v1/admin/*` wajib sesi — ditentukan dari registrasi route, bukan pencocokan string path.
- [ ] Peta permission identik legacy: `super_admin` semua; `content_editor` semua kecuali
      `email_campaign_logs.read` dan `activity.read`.
- [ ] CSRF double-submit pada method non-aman di route ber-guard, compare constant-time (BC-09).
- [ ] Users (6 endpoint): bcrypt cost 12; email lowercase; 409 duplikat; aturan content_editor
      (tidak melihat super admin → 404, tidak bisa memberi role super_admin → 403, disaring dari
      list); tidak bisa menonaktifkan/menurunkan diri sendiri (403); super admin aktif terakhir
      dilindungi (403); ganti password user lain & nonaktifkan → semua sesinya dicabut (event);
      `DELETE` = nonaktifkan (soft); audit (BC-11).
- [ ] Janitor sesi kedaluwarsa & OAuth state (BC-08).

## 3.5 Media

- [ ] Upload multipart (`file`, `usage` ∈ hero|partner|portfolio|machine|gallery|news|og|other,
      `alt_text?`, `caption?`); deteksi magic bytes (WebP RIFF, PNG, JPEG FFD8FF, `ftyp` → MP4), lainnya
      415; batas `UPLOAD_IMAGE_MAX_MB` 10 / `UPLOAD_VIDEO_MAX_MB` 100 → 413.
- [ ] Pipeline gambar (Go murni, ADR-0008): baca dimensi dari header sebelum decode penuh (tolak
      > 100 MP), decode, auto-orient EXIF, 3 varian lebar 480/960/1600 (dari env) tanpa upscale,
      WebP q82, upload paralel; bila satu gagal, varian yang sudah terupload dihapus. Dimensi yang
      disimpan = dimensi setelah orientasi (BC-14). File asli tidak disimpan (paritas).
- [ ] Object key: `${MEDIA_OBJECT_PREFIX}/${MEDIA_STORAGE_ENV}/${kategori}/${YYYY-MM-DD Asia/Jakarta}/${uuid}-{thumbnail|medium|large}.webp`,
      video `…-video.mp4`; peta kategori (gallery→galeri, hero→hero, machine→mesin, news→berita,
      og→seo, other→lainnya, partner→partner, portfolio→portofolio); PutObject `ACL public-read`,
      `Cache-Control: public, max-age=31536000, immutable`, ContentType, ContentLength.
- [ ] Video disimpan apa adanya.
- [ ] List (default limit 16; filter q, media_type, compression_status, usage; arsip/pending_delete/
      deleted/cleanup_failed disembunyikan default), detail, arsip/unarsip (409 bila dipakai; unarsip
      ke status sebelumnya atau completed), hapus permanen (409 bila dipakai; gagal hapus storage →
      `cleanup_failed` + 409 kode domain dengan pesan asli), retry (hanya failed; paritas).
- [ ] Referensi dihitung lewat `ReferenceProvider` yang terdaftar (bukan query tabel modul lain).
- [ ] Storage driver `local` untuk dev, dan Go menyajikan file lokal di dev (legacy tidak).
- [ ] **Benchmark gate** vs sharp: 20 gambar sampel (JPEG EXIF, PNG alpha, WebP, foto 12 MP) — SSIM
      ≥ 0,98 terhadap output sharp, ukuran file dalam ±15%, p95 waktu proses ≤ 2 dtk untuk 12 MP.
      Gagal → amandemen ADR-0008 ke libvips di image Docker.

## 3.6 Konten (settings, profile, portfolio, gallery, news) & orkestrasi publik (site)

Admin — 12 resource + site settings (matriks lengkap: inventaris backend §1 "admin-content"):
- [ ] Per resource: list, detail, create, update, status, archive, unarchive, delete permanen,
      reorder (resource yang mendukung), dengan field wajib, field yang bisa ditulis, kolom search,
      filter, dan urutan persis seperti matriks legacy.
- [ ] Aturan generik: default status draft (kategori portofolio default published); slug otomatis;
      `published_at` (tanggal masa depan di-clamp ke sekarang; di-set sekarang saat publish; endpoint
      status mengisinya hanya untuk portfolio, gallery, news); arsip menyimpan `previous_status`,
      unarsip mengembalikan ke status sebelumnya atau draft; arsip tersembunyi dari list kecuali
      filter status; referensi media wajib `completed`; unique → 409; tidak ada → 404.
- [ ] Aturan khusus: `hero_section_id` 0/kosong → hero pertama (422 bila tidak ada); kategori
      portofolio tidak bisa dihapus bila dipakai (409); portofolio butuh kategori published dan ≥ 1
      gambar untuk publish (422), maks 10 gambar, galeri gambar diganti atomik **hanya bila dikirim**,
      gambar pertama = cover; berita butuh konten untuk publish (422); reorder satu transaksi.
- [ ] Hapus permanen → `MediaClient.DeleteIfUnused` untuk semua media terkait (termasuk media semua
      slide untuk hero).
- [ ] Setiap mutasi: audit `<resource>.<create|update|status|archive|unarchive|reorder|permanent_delete>`
      + event `content.changed{keys}` dengan peta cache key legacy (site-settings → home, settings,
      SEO, sitemap; hero/slide/partner → home; keunggulan/mesin/kapasitas/layanan → home, fasilitas;
      portofolio & kategori → home, list, kategori, sitemap; galeri → list, home; berita → home, list,
      sitemap).
- [ ] Site settings: `GET/PATCH /admin/site-settings` (permission `site_settings.manage`), 4 media
      (logo navbar, logo footer, OG, hero kontak).

Publik (field respons persis inventaris):
- [ ] `GET /public/site-settings`, `/public/home` (hero + slides, partners, strengths, featured
      portfolios ≤ 6, facilities_summary {machines ≤ 3, printing ≤ 3, production ≤ 6, services ≤ 10},
      latest_news ≤ 3), `/public/portfolio` (category|category_slug, limit ≤ 24 default 8, cursor),
      `/public/portfolio-categories` (kategori published yang punya portofolio published + count),
      `/public/facilities`, `/public/gallery` (type, limit ≤ 24 default 8, cursor), `/public/news`
      (page, limit ≤ 24 default 6, category), `/public/news/{slug}` (regex slug).
- [ ] Cache in-process untuk payload publik & SEO, di-invalidasi event `content.changed` (BC-12),
      TTL pengaman 60 dtk. Endpoint `POST /internal/revalidation/tick` dipertahankan sebagai
      "flush cache" operasional.

## 3.7 Leads, audience, notifications

- [ ] Inquiry publik (10/60 dtk): validasi (nama 2–120, email, telepon regex, company?, pesan
      10–5000, `website?`); honeypot terisi → `{id:0,status:"new"}` tanpa menyimpan; `source` =
      Referer atau "website"; `meta` = `{user_agent, referrer, ip_hash}`; event `inquiry.created`.
- [ ] WhatsApp lead publik (10/60 dtk): `whatsapp_url = https://wa.me/<nomor settings>?text=<encoded>`,
      format `generated_message` identik legacy; event `whatsapp_lead.created`.
- [ ] Admin inquiries & whatsapp-leads (list q/status/pagination, detail — 404 bila diarsip, PATCH
      status + `internal_note` ≤ 5000, DELETE = arsip soft).
- [ ] Audience: upsert kontak per email dari `inquiry.created` (update tidak mengubah status/consent);
      `GET /admin/audience/contacts`, `/preview`, `/export.csv` (UTF-8 BOM, CRLF, semua sel di-quote,
      kolom Nama, Email, Telepon, Perusahaan, Sumber, Status, Consent, Interaksi Terakhir, Dibuat;
      maks 10.000 baris); hanya kontak aktif menjadi penerima kampanye.
- [ ] Notifications: dibuat dari `inquiry.created` (+ job email bila `NOTIFICATION_EMAIL_ENABLED`) dan
      `whatsapp_lead.created`; list (limit ≤ 50 default 10, read=all|unread, q), unread-count,
      read, read-all (maks 500).
- [ ] **SSE** `GET /admin/notifications/stream`: `text/event-stream`, `X-Accel-Buffering: no`,
      format `event:<type>\nid:<n>\ndata:<json>\n\n` (id naik per koneksi mulai 1, setiap data berisi
      `timestamp`); event `connected`, `heartbeat` (`NOTIFICATION_STREAM_HEARTBEAT_MS` 30 dtk),
      `notification.created` (broadcast ke semua admin), `notification.read` (hanya koneksi user itu);
      hub in-memory (instans tunggal, ADR-0009); tanpa rate limit; koneksi dibersihkan saat putus.
- [ ] Worker email notifikasi terjadwal in-app (BC-02, `NOTIFICATION_WORKER_POLL_MS`): claim ≤ 20 job
      pending, maks 3 percobaan, backoff `attempt × 60 dtk`, pengirim = akun `NOTIFICATION_EMAIL_SENDER`
      atau akun SMTP terhubung terbaru, penerima = `NOTIFICATION_EMAIL_TO` atau email settings;
      pemulihan job macet; mode mock (BC-03); header disanitasi (BC-09); hasil akhir → event
      `notification_email.finished` → leads mengisi `inquiries.notification_status` (sent/failed).

## 3.8 Email: akun, template, kampanye

Akun email:
- [ ] Google OAuth: URL `accounts.google.com/o/oauth2/v2/auth` (scope `openid email
      https://www.googleapis.com/auth/gmail.send`, `access_type=offline`, `prompt=consent`,
      `login_hint`); `state = base64url(JSON{nonce,admin_user_id,exp}).base64url(HMAC-SHA256(SESSION_SECRET))`,
      disimpan sha256 hex, berlaku 10 menit, sekali pakai; callback memeriksa tanda tangan, exp,
      keberadaan, belum dipakai, admin_user_id; tukar token + userinfo; token dienkripsi; redirect
      `${PUBLIC_SITE_URL}/admin/email-accounts?connected=google&status=success|error&reason=…`.
      **Path callback sama dengan legacy** (tidak perlu ubah Google Cloud Console).
- [ ] SMTP: test (`{valid,message}`), create (verifikasi dulu, 422 bila gagal, upsert per
      `(provider,email)`), update (akun Google hanya display_name/status; perubahan field SMTP →
      verifikasi ulang → connected), reconnect (Google → URL OAuth baru; SMTP → verifikasi ulang,
      `needs_reconnect` bila gagal), disable, delete (422 bila dipakai kampanye via `UsageChecker`).
      Secret tidak pernah dikembalikan; `security=none` ditolak di produksi.
- [ ] `Sender`: SMTP (implicit TLS untuk `ssl_tls`, STARTTLS wajib untuk `starttls`, timeout
      `SMTP_TEST_TIMEOUT_MS`); Gmail API `users/me/messages/send` dengan **refresh token otomatis**
      dan token baru disimpan terenkripsi (BC-01), pesan multipart/alternative teks + HTML (BC-15);
      mode mock (`fail`/`tempfail` sesuai legacy).

Template:
- [ ] 4 endpoint; mode HTML butuh `body_html`, mode teks butuh `body_text` (422); default limit 50;
      hapus permanen.

Kampanye:
- [ ] Draft (penerima 1–1.000, dedupe email lowercase, variabel: key lowercase `^[a-z0-9_]+$`,
      ≤ 50 key, nilai dipotong 2.000 karakter), draft dari inquiry (filter q/status/date_from/date_to
      dengan batas hari Asia/Jakarta), draft dari audience, update hanya draft (422), send (permission
      `email_campaigns.send`, akun harus connected → 422, penerima di-reset ke queued, memicu drain),
      resend-failed, list/detail, recipients (filter status), logs (permission
      `email_campaign_logs.read`), preview penerima inquiry.
- [ ] Worker (paritas penuh): poll `EMAIL_WORKER_POLL_MS` 60 dtk + dipicu send/resend; single-flight +
      re-arm; claim DB bersyarat (pending → processing dengan `locked_at`, atau processing dengan
      `locked_at` null) hanya untuk akun connected; batch `EMAIL_WORKER_BATCH_SIZE` 50 penerima yang
      jatuh tempo; kirim berurutan; tiap percobaan: status sending + lock + attempts++ + baris
      `email_send_logs`; gagal sementara & attempt < 3 → queued lagi +60 dtk, selain itu failed;
      Gmail 5xx sementara, 4xx permanen, exception SMTP sementara; kegagalan level akun (EAUTH,
      ECONNECTION, ETIMEDOUT, ESOCKET, EDNS, ECONNREFUSED, EHOSTUNREACH, Gmail 401/403 setelah refresh
      gagal, token/config hilang) → penerima kembali queued tanpa memakai attempt, akun
      `needs_reconnect`, `last_error` kampanye, batch berhenti, kampanye tetap processing dan lanjut
      otomatis setelah akun tersambung lagi; pemulihan lock basi `EMAIL_WORKER_STALE_MS` 300 dtk;
      agregat dihitung ulang tiap batch; completed bila tidak ada queued/sending; error fatal → failed.
- [ ] Substitusi variabel saat kirim: `{{ key }}` case-insensitive, key tak dikenal → "", subject &
      teks nilai mentah, HTML nilai di-escape, `email` selalu alamat penerima, `nama` fallback ke nama;
      `body_html` dipakai hanya bila berisi teks terlihat, selain itu `body_text` → `<p>` ter-escape;
      keduanya kosong → 422; CR/LF di header dibuang.

## 3.9 Dashboard, health, SPA shell & SEO sisi server

- [ ] Dashboard: totals (inquiries, whatsapp_leads, published_gallery, published_news,
      active_portfolios, completed_media, failed_media, connected_email_accounts, email_campaigns,
      pending_email_campaigns), latest_inquiries 5, latest_whatsapp_leads 5, latest_email_campaigns 5.
- [ ] Health: `SELECT 1` timeout 2 dtk (gagal → 503), ping storage timeout 5 dtk (gagal → degraded),
      `uptime_seconds`, `service`.
- [ ] `GET /robots.txt` (disallow `/admin`, `/login`, `/api/`, `/internal/`, sitemap) dan
      `GET /sitemap.xml` (6 halaman statis + `/berita/<slug>` berita published, lastmod = updated_at).
- [ ] `GET /api/v1/public/seo?path=` (+ alias legacy `/public/seo/{route}`).
- [ ] **SPA shell** (`PUBLIC_DIR`): file statis ada → disajikan (`/assets/*` immutable 1 tahun, lainnya
      cache pendek); selain itu → shell `index.html`:
  - Route publik: sisipkan title, description, robots, canonical tunggal, OG/Twitter, JSON-LD
    (Organization + WebSite di semua halaman publik, Article di detail berita), default dari
    pengaturan admin (BC-21), `<link rel="preload" as="image" fetchpriority="high">` untuk gambar LCP
    (slide hero pertama, thumbnail berita), `modulepreload` chunk route + preload font dari manifest
    Vite, JSON bootstrap (`site_settings`, `seo`, `page`, `path`).
  - `/login`, `/admin/*`: noindex, tanpa canonical & tanpa data halaman, `Cache-Control: no-store`.
  - Path tak dikenal atau slug berita tidak ada: HTTP 404 + noindex + penanda `not_found` di bootstrap.
  - Escape aman: JSON bootstrap meng-escape `<`, `>`, `&`, U+2028, U+2029; nilai atribut di-escape
    HTML (test dengan judul berisi `</script>`).
  - Header HTML: CSP (default-src 'self'; img-src 'self' data: host media; font-src 'self';
    connect-src 'self'; frame-ancestors 'self'; object-src 'none'; base-uri 'self'), dikunci di
    PLAN-04 setelah mode report-only bersih.

## 3.10 Seed & data dev/test

- [ ] `cmd/seed`: dua user dari `SEED_*` (wajib, tanpa default — BC-07), akun SMTP opsional, site
      settings default & 8 kategori portofolio **hanya bila belum ada** (tidak menimpa data, berbeda
      dengan seed legacy).
- [ ] `apps/api/testdata/synthetic/`: dataset sintetis PLAN-01 versi skema baru (data identik dengan
      fixture MSW) untuk test HTTP dan E2E PLAN-04.
- [ ] `cmd/seed-demo` (dev): port `sync-default-media` (manifest 59 aset) memakai driver storage lokal.

## 3.11 Observabilitas & operasi

- [ ] Log JSON (slog): access log (method, path, status, durasi, request_id), error 5xx dengan stack,
      log worker (claim, batch, hasil), tanpa data pribadi mentah (email/telepon di-mask).
- [ ] Graceful shutdown (SIGTERM): berhenti menerima → tutup SSE → hentikan scheduler → tunggu kiriman
      yang sedang berjalan (maks 25 dtk) → lepas lock → tutup DB.
- [ ] Endpoint tick internal (`/internal/workers/email-campaigns/tick`, `/notifications/tick`,
      `/revalidation/tick`) dengan header `x-internal-worker-secret` (compare constant-time).

## 3.12 Strategi test & quality gate

| Layer | Cakupan | Gate |
|---|---|---|
| Unit | application & domain setiap modul dengan fake contract; slug, substitusi variabel, klasifikasi error kirim, aturan user, published_at, cursor | lulus 100% |
| Repository | query sqlc terhadap MySQL test nyata (migration up → test → down) | lulus 100% |
| HTTP / kontrak | router penuh + DB nyata + fake storage & mail; setiap endpoint: sukses, validasi (tiap field wajib & field asing), 401, 403 per role, 403 CSRF, 404, 409, 422, 429 (jam palsu), header cache & request-id; **setiap respons divalidasi `openapi.yaml`** (kin-openapi) | 100% operationId di kontrak punya test; 0 pelanggaran |
| Traceability legacy | `apps/api/test/LEGACY_CASES.md`: ±207 case unit + 43 case e2e legacy dipetakan ke nama test Go atau "N/A" beralasan | 100% terpetakan |
| Worker | jam palsu + Sender palsu: retry, backoff, pause/resume akun, pemulihan lock basi, 2 worker bersamaan tanpa kirim ganda (`-race`) | lulus 100% |
| SSE | connect, heartbeat, broadcast, event per user, cleanup, 100 klien | lulus 100% |
| Media | golden image (EXIF, alpha, WebP, rusak, > 100 MP), lebar varian, tanpa upscale, rollback upload; benchmark §3.5 | lulus + benchmark lulus |
| Kompatibilitas kripto | fixture dibuat kode legacy Node: dekripsi `v1:` legacy, bcrypt legacy, HMAC sesi, state OAuth; dan sebaliknya (Go → Node) untuk rollback | lulus 100% |
| SPA shell | golden head per route, status 404, escape XSS, preload dari manifest | lulus 100% |
| Arsitektur & tooling | archtest boundary, `sqlc diff` bersih, migration up/down/up, `go vet`, `golangci-lint` (termasuk gosec, errcheck, staticcheck), `govulncheck` 0 temuan, `gofmt` | 0 error |
| Race | `go test -race ./...` | 0 race |
| Coverage | total ≥ 80%; paket `application` + `domain` ≥ 85% | di CI |

Sinyal awal integrasi (tidak memblokir): jalankan subset E2E PLAN-02 (alur publik + login + satu CRUD)
terhadap Go + dataset sintetis sebelum PLAN-04.

## 3.13 Fase implementasi

| Fase | Isi | Ukuran |
|---|---|---|
| B1 Platform | 3.2 lengkap + harness contract test + archtest | M |
| B2 Skema | migration semua modul + `sqlc.yaml` + `DATABASE.md` dibekukan | M |
| B3 Auth, users, audit | 3.4 | M |
| B4 Media | 3.5 + benchmark | L |
| B5 Konten | settings, profile, portfolio, gallery, news (admin + publik) | L |
| B6 Site | home, fasilitas, SEO, robots, sitemap, SPA shell, cache | M |
| B7 Leads, audience, notifications | 3.7 + SSE + worker notifikasi | M |
| B8 Akun & template email | 3.8 (akun, OAuth, Sender, template) | M |
| B9 Kampanye | 3.8 (kampanye + worker) | L |
| B10 Dashboard, health, tick, seed | 3.9, 3.10, 3.11 | S |
| B11 Hardening | race, lint, coverage, `LEGACY_CASES.md` 100%, `knowledge/BACKEND.md`, `API.md`, `MODULE_MAP.md` | S |

## Definition of Done

- [ ] Semua gate §3.12 hijau di CI.
- [ ] Semua operasi di kontrak (160 endpoint legacy + endpoint SEO baru `GET /public/seo?path=`)
      terimplementasi dan ter-test; tidak ada endpoint di luar kontrak.
- [ ] Archtest hijau: tidak ada import lintas modul selain `contracts/`, tidak ada FK/join lintas modul.
- [ ] Setiap BC backend (BC-01..BC-15) punya test yang membuktikannya dan tercatat di ADR-0012.
- [ ] Benchmark media lulus (atau ADR-0008 diamandemen).
- [ ] `npm run dev:api` (Air) jalan di Windows; `npm run build:api` menghasilkan binary statis.
- [ ] `knowledge/DATABASE.md` final & dibekukan; `BACKEND.md`, `API.md`, `MODULE_MAP.md` diperbarui.
- [ ] Final Checklist standar bagian backend lulus (Air, golang-migrate, sqlc, `database/sql`, tanpa
      GORM, contracts-only).

## Risiko & mitigasi

| Risiko | Mitigasi |
|---|---|
| Perilaku legacy tersembunyi yang tidak ada di inventaris | Baca kode legacy per modul sebelum mengerjakannya; `LEGACY_CASES.md` 100% |
| Kualitas/performa WebP Go murni di bawah sharp | Benchmark gate §3.5 dengan jalur cadangan libvips |
| Kirim email ganda / hilang saat worker crash | Claim DB bersyarat, lock + pemulihan, test konkurensi `-race`, graceful shutdown |
| Import cycle antar modul | Pola provider/event di §3.1, archtest di CI |
| Kontrak ambigu ditemukan saat implementasi | Ubah kontrak dulu (PR terpisah), regenerate tipe, beri tahu sisi frontend; tidak ada perubahan diam-diam |
| SSE putus di balik proxy / timeout server | `ResponseController` deadline, heartbeat, uji lewat Nginx di PLAN-04 |
