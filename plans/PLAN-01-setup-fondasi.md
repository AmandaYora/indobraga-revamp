# PLAN-01 — Fondasi Project (Dimas Monorepo Standard, backend Go)

> **PENUNDAAN TESTING — keputusan owner 2026-09-27.** Seluruh pekerjaan pengujian ditunda di
> semua plan: menulis/menjalankan test unit, komponen, page, kontrak (validasi mock), E2E,
> visual regression, aksesibilitas otomatis, coverage gate, load/performance test, security scan
> dinamis, skenario INT, dan verifikasi berbasis test. Butir checklist/DoD yang mensyaratkan test
> **bukan syarat selesai** sampai owner mengaktifkannya kembali. Pemeriksaan statis tetap wajib
> karena bukan pengujian: typecheck, lint, format, build, lint & mapping kontrak, `go vet`,
> `golangci-lint`, `govulncheck`. Test yang sudah ada dibiarkan di repo, tidak dijalankan di CI.

## Tujuan

Menyiapkan `indobraga-revamp` sebagai repo git sendiri yang 100% sesuai Dimas Monorepo Standard
(backend `go`), dengan semua fondasi yang dibutuhkan PLAN-02 s.d. PLAN-05:

1. Repo, scaffold, dan toolchain berjalan (`npm run dev:web`, `npm run dev:api`).
2. `knowledge/`, `CLAUDE.md`, `.claude/rules/` berisi fakta proyek Indobraga (bukan template).
3. Semua keputusan arsitektur terkunci sebagai ADR.
4. **Kontrak API v1** (`packages/api-contract/openapi.yaml`) lengkap untuk seluruh 160 endpoint legacy.
5. **Baseline legacy** (screenshot, respons API, SEO head, daftar URL, Lighthouse) terekam sebagai
   acuan paritas untuk plan berikutnya.
6. CI dasar hijau.

**Di luar lingkup:** implementasi fitur (PLAN-02/03), skema DB final (PLAN-03), VPS baru (PLAN-04).

## Prasyarat

- [ ] Context7 MCP sudah diotorisasi (`/mcp` di sesi `claude` interaktif). — _belum — Context7 masih perlu diotorisasi_
- [x] Terpasang di mesin dev (Windows 11): Git, Node.js 22 LTS (≥ 22.12, sama dengan legacy), Go
      stabil terbaru, MySQL 8 lokal (level OS, bukan Docker), Docker Desktop (hanya untuk uji build
      image), Git LFS.
- [x] Legacy `indobraga/` bisa dijalankan lokal (`npm run dev:api`, `npm run dev:web`) dengan
      database lokal berisi **dataset sintetis** (untuk baseline admin, §1.7). Dump produksi tidak
      dibutuhkan di plan ini (baru dipakai di PLAN-05).
- [x] Dimas membuat repo GitHub privat kosong untuk `indobraga-revamp` (aksi keluar: Claude tidak — _catatan: repo dibuat **public**, bukan privat_
      membuat repo/push tanpa konfirmasi).

---

## 1.0 Housekeeping repo legacy

Kondisi saat ini: git root ada di `H:\dimasprasetio\SAAS\indobraga\` sementara isi legacy sudah
dipindah ke subfolder `indobraga/`, sehingga git melihat 364 file terhapus + folder untracked, dan
`indobraga-revamp/` berada **di dalam** working tree repo legacy.

- [x] Konfirmasi ke Dimas, lalu pindahkan `H:\dimasprasetio\SAAS\indobraga\.git` → — _dilakukan 2026-09-26: isi `.git` tersalin ke `indobraga/.git`, folder lama yang kosong dihapus_
      `H:\dimasprasetio\SAAS\indobraga\indobraga\.git`.
- [x] Verifikasi di `indobraga/`: `git status` bersih (path kembali sejajar), `git log` utuh,
      remote tidak berubah.
- [x] Verifikasi `H:\dimasprasetio\SAAS\indobraga\` bukan lagi repo git, sehingga
      `indobraga-revamp/` bisa menjadi repo independen.
- [x] Tandai legacy sebagai **read-only** sampai PLAN-05 (tidak ada commit fitur baru di legacy
      kecuali hotfix produksi; setiap hotfix legacy dicatat agar ikut diterapkan di revamp).

## 1.1 Inisialisasi repo

- [x] `git init -b main` di `indobraga-revamp/`.
- [x] Commit pertama berisi `plans/` dan `analysis/000-legacy-inventory/` (sudah ada).
- [x] Setelah Dimas mengonfirmasi: tambah remote GitHub, push `main`.
- [ ] Branch protection `main`: wajib PR + CI hijau; commit mengikuti Conventional Commits. — _menunggu persetujuan Dimas (mengubah pengaturan repo)_
- [ ] Git LFS untuk `*.png` di folder snapshot visual (`apps/web/e2e/**/__screenshots__/**`). — _dibatalkan — amandemen owner: snapshot visual tidak dipakai_

## 1.2 Scaffold dengan skill monorepo-standard

```powershell
node "$HOME/.claude/skills/monorepo-standard/scripts/scaffold.mjs" `
  --name indobraga --backend go --dir "H:\dimasprasetio\SAAS\indobraga\indobraga-revamp" --force
```

`--force` dibutuhkan karena `plans/` dan `analysis/` sudah ada (scaffold hanya menimpa file yang ia
tulis sendiri; pastikan `analysis/000-legacy-inventory/` utuh setelahnya).

Penyesuaian setelah scaffold:
- [x] Hapus contoh modul `order` dan migration contoh `000001_create_users_table.*` (skema asli
      dibuat di PLAN-03).
- [x] `infra/docker/Dockerfile`: base image `node:22-alpine` (vite 7 butuh Node ≥ 20.19/22.12) dan
      `golang:<stabil terbaru>-alpine`; runtime image non-root. Finalisasi di PLAN-04.
- [x] `apps/api/go.mod`: module path `github.com/<owner>/indobraga-revamp/apps/api` (sesuai remote),
      lalu `go mod tidy`.
- [x] Root `package.json`: `name: "indobraga"`, workspaces `apps/web` + `packages/*`,
      `engines.node >= 22.12.0`, script standar Go (`dev:web`, `dev:api`, `build:web`, `build:api`,
      `migrate:up`, `migrate:down`, `migrate:create`, `sqlc:generate`) + script tambahan:
      `contract:lint`, `contract:generate`, `test:web`, `test:api`, `lint:web`, `lint:api`,
      `e2e:web`.
- [x] Jangan membawa apa pun dari legacy selain yang disebut plan: tidak ada `ruvector.db`,
      `.swarm/`, `.claude-flow/`, `agentdb.rvf*`, `Lighthouse.json`, `invoices/`, `.deploy/`,
      `elcodelabs.png`, konfigurasi `@lovable.dev`.

## 1.3 Toolchain & dev loop

- [x] Install CLI Go dan catat versinya di `knowledge/DEPLOYMENT.md`:
      Air, golang-migrate (build tag `mysql`), sqlc, golangci-lint, govulncheck.
      Catatan Windows: sqlc via binary rilis resmi bila `go install` gagal (dependensi cgo).
- [x] Air di Windows: pastikan binary build berakhiran `.exe`. Bila `.air.toml` tidak bisa melayani
      Windows + Linux sekaligus, buat `.air.windows.toml` dan wrapper kecil `scripts/dev-api.mjs`
      yang memilih config per OS — `npm run dev:api` tetap satu perintah dari root.
- [x] Database lokal: `indobraga_revamp` (dev) dan `indobraga_revamp_test` (test), user MySQL
      khusus aplikasi (bukan root), collation `utf8mb4_unicode_ci` (sama dengan legacy agar urutan
      sortir & pencarian identik).
- [x] `.env.example` di root berisi **semua** variabel (tanpa nilai rahasia). Tabel pemetaan
      env legacy → env baru di `knowledge/DEPLOYMENT.md`:

      | Legacy | Baru | Catatan |
      |---|---|---|
      | `API_PORT`, `API_HOST` | `APP_PORT=8080`, `APP_HOST` | satu port app |
      | `NODE_ENV` | `APP_ENV` | development/test/production |
      | `DATABASE_URL` | `DB_DSN` (+ `DB_HOST/PORT/USER/PASSWORD/NAME`) | format Go `user:pass@tcp(host:port)/db?parseTime=true&loc=UTC` |
      | `API_GLOBAL_PREFIX` | – | dikunci `/api/v1` |
      | `SESSION_*`, `CSRF_COOKIE_NAME`, `ADMIN_SESSION_TTL_DAYS`, `CREDENTIAL_ENCRYPTION_KEY` | sama | ganti `JWT_*` template standar (ADR-0006) |
      | `CORS_ORIGINS` | – | dihapus: satu origin |
      | `PUBLIC_SITE_URL`, `PUBLIC_MEDIA_URL` | sama | |
      | `UPLOAD_*`, `MEDIA_*`, `STORAGE_*`, `S3_*` | sama | variabel legacy yang tidak dipakai dibuang |
      | `INTERNAL_WORKER_SECRET`, `EMAIL_*`, `SMTP_TEST_TIMEOUT_MS` | sama | |
      | `NOTIFICATION_*` | sama | + `NOTIFICATION_WORKER_POLL_MS` (BC-02) |
      | `GOOGLE_OAUTH_*` | sama | redirect URI path tetap sama |
      | `SEED_*` | sama | tanpa default (BC-07) |
      | – | `PUBLIC_DIR`, `TRUSTED_PROXIES`, `LOG_LEVEL` | baru |
      | `VITE_API_BASE_URL`, `VITE_CSRF_COOKIE_NAME` | sama | `VITE_API_BASE_URL` kosong = same-origin |
      | – | `VITE_API_MOCK` | `true` = frontend memakai MSW (PLAN-02) |

- [x] Verifikasi dev loop: `npm run dev:api` → `GET http://localhost:8080/api/v1/health` →
      `success:true`; `npm run dev:web` → Vite jalan, proxy `/api` mencapai API. Tanpa CORS.

## 1.4 Knowledge gateway

Isi dengan fakta Indobraga (sumber: `analysis/000-legacy-inventory/*`):

- [x] `CLAUDE.md` — identitas proyek, perintah wajib, aturan arsitektur kritis, pointer ke
      `knowledge/`, `plans/README.md`, daftar BC, dan instruksi: *baca knowledge + plan relevan
      sebelum mengubah kode; cek paritas legacy di `analysis/000-legacy-inventory/`.*
- [x] `knowledge/PROJECT.md` — ringkasan PRD legacy: tujuan bisnis, persona (pengunjung, super
      admin, content editor), fitur publik & admin, user story.
- [x] `knowledge/ARCHITECTURE.md` — topologi (SPA + Go dalam 1 container, MySQL host, S3,
      SMTP/Gmail), alur request, alur SEO shell (ADR-0005), alur worker & event.
- [x] `knowledge/MODULE_MAP.md` — modul backend & frontend dengan kolom **tanggung jawab, public
      contract, owned tables, external integrations** (draf dari PLAN-03 §3.1; difinalkan di sana).
- [x] `knowledge/GLOSSARY.md` — istilah domain Indonesia ↔ kode: pesan kontak (inquiry), prospek
      WhatsApp (whatsapp lead), kampanye/email massal (campaign), penerima (recipient), audiens
      (marketing contact), tayang (published), draf, arsip, konten, media siap pakai (completed), dsb.
- [x] `knowledge/API.md` — konvensi (envelope, error code, pagination offset & cursor, cache
      header, rate limit, CSRF, request id) + indeks endpoint per modul yang menunjuk ke
      `openapi.yaml`.
- [x] `knowledge/DATABASE.md` — konvensi (ADR-0007) + draf tabel per modul (final di PLAN-03).
- [x] `knowledge/FRONTEND.md` — struktur modul, token desain, pola data, pola SEO, aturan test visual.
- [x] `knowledge/BACKEND.md` — struktur modul Go, contracts, event bus, scheduler, error, validasi.
- [x] `knowledge/DEPLOYMENT.md` — dev lokal, build, Docker, VPS baru, env, backup.
- [x] `knowledge/SOURCE_PRIORITY.md` — urutan standar skill; tambahkan: untuk *perilaku yang
      terlihat user*, baseline legacy (`analysis/000-legacy-inventory/` + snapshot §1.7) menang atas
      asumsi, kecuali ada BC.
- [x] `.claude/rules/` — sesuaikan 5 rule scaffold (path-scoped) + tambah:
      `legacy-parity.md` (setiap perubahan UI/perilaku wajib cek baseline & BC),
      `testing.md` (gate test per layer), `security.md` (PII, secret, upload, CSRF).

## 1.5 ADR (`knowledge/decisions/`)

Tulis (format: konteks, keputusan, alternatif ditolak, konsekuensi):

- [x] **ADR-0004 Kontrak & envelope API.**
      Sukses `{success:true, message, data}`; list offset `meta:{page,limit,total,total_pages}`;
      list cursor `meta:{limit,next_cursor,has_more}`; error
      `{success:false, code, message, errors:[{field,message}], request_id}`; header `X-Request-Id`
      selalu ada. Snake_case. Path legacy dipertahankan (termasuk callback OAuth). Daftar error code
      = 13 kode legacy + kode domain (BC-04). Alasan: frontend & backend sama-sama ditulis ulang,
      jadi tidak ada beban kompatibilitas; `code` dibutuhkan UI (mis. redirect saat
      `UNAUTHENTICATED`).
- [x] **ADR-0005 SEO untuk SPA.** Go menyajikan `index.html` hasil build Vite dengan placeholder
      `<!--app-head-->` dan `<!--app-bootstrap-->`; untuk route publik Go mengisi title, meta,
      canonical, OG/Twitter, JSON-LD, `<link rel=preload>` gambar LCP, dan JSON bootstrap (data
      halaman + site settings) yang di-escape aman. Status HTTP 404 untuk route/slug tak dikenal.
      Satu sumber SEO: modul `site` di Go; frontend memakai data SEO yang sama saat navigasi client.
      Cadangan: snapshot HTML konten (dipicu bila Search Console menunjukkan regresi indexing).
- [x] **ADR-0006 Auth.** Cookie session: token acak 32 byte, disimpan sebagai HMAC-SHA256 di DB,
      httpOnly + SameSite=Lax + Secure (prod), TTL 7 hari; CSRF double-submit (`x-csrf-token`);
      role `super_admin`/`content_editor` + permission map identik legacy. Menggantikan `JWT_*`
      dari template standar.
- [x] **ADR-0007 Konvensi database.** MySQL 8, `utf8mb4_unicode_ci`, `DATETIME(3)` UTC,
      `created_at/updated_at` default DB (BC-10), enum = `VARCHAR` lowercase + `CHECK` (BC-13),
      FK hanya intra-modul, relasi lintas modul = ID primitif + index, tanpa join lintas modul,
      ID legacy dipertahankan saat migrasi, sqlc per modul.
- [x] **ADR-0008 Media.** Bucket S3 IDCloudHost yang sama; DB menyimpan object key per varian, URL
      diturunkan dari `PUBLIC_MEDIA_URL`; varian WebP 480/960/1600 q82 tanpa upscale, auto-orient
      EXIF, batas 100 MP; video disimpan apa adanya; pipeline Go murni tanpa cgo (build lintas OS,
      termasuk Windows). Alternatif libvips/govips ditolak kecuali benchmark PLAN-03 gagal.
- [x] **ADR-0009 Background job & event.** Scheduler in-process (ticker per job, single-flight,
      graceful shutdown), claim DB bersyarat untuk aman multi-instance, event bus in-process
      sinkron setelah commit untuk side effect lintas modul; tanpa Redis/queue (anti-overengineering).
- [x] **ADR-0010 Sumber kebenaran desain.** UI legacy = spesifikasi; token warna oklch, font,
      radius, shadow, animasi dipindah apa adanya ke `src/theme/`; Radix + pola shadcn tetap dipakai
      di `shared/components/ui`; skill `frontend-design` dipakai untuk state yang belum ada di legacy
      (404, empty, error) dan review konsistensi, bukan restyle.
- [x] **ADR-0011 Strategi test & quality gate** (ringkas dari PLAN-02 §2.9 dan PLAN-03 §3.12).
- [x] **ADR-0012 Perubahan perilaku legacy** — salin daftar BC dari `plans/README.md`, masing-masing
      dengan alasan dan test yang membuktikannya.
- [x] **ADR-0013 Topologi deploy** — VPS baru, 1 container app port 8080, MySQL host,
      Nginx (TLS, SSE, body size, gzip/brotli), image di GHCR, deploy via GitHub Actions.

## 1.6 Kontrak API v1 (`packages/api-contract`)

- [x] `openapi.yaml` (OpenAPI 3.1) mencakup **seluruh 160 endpoint** legacy
      (sumber: `analysis/000-legacy-inventory/backend.md` §1), dikelompokkan per tag = modul backend.
- [x] Komponen bersama: envelope sukses/error, `PaginationMeta`, `CursorMeta`, `MediaPreview`,
      enum status (lowercase), `ContentStatus`, security scheme (`sessionCookie`, `csrfHeader`,
      `workerSecret`), header `X-Request-Id`, header rate limit.
- [x] Untuk 12 resource admin-content (list/detail/create/update/status/archive/unarchive/delete/
      reorder), gunakan generator kecil (`packages/api-contract/scripts/build-content-paths.mjs`)
      agar 86 endpoint konsisten; output di-commit.
- [x] Setiap operasi punya: permission yang dibutuhkan (extension `x-permission`), rate limit
      (`x-rate-limit`), cache policy (`x-cache-control`), contoh request/respons, semua kode error
      yang mungkin.
- [x] Endpoint tanpa JSON envelope didokumentasikan apa adanya: SSE `text/event-stream`, CSV
      export, `robots.txt`, `sitemap.xml`, redirect callback OAuth.
- [x] Endpoint SEO baru untuk SPA: `GET /api/v1/public/seo?path=<path>` →
      `{title, description, canonical_url, robots, og, twitter, json_ld[], status}` (menggantikan
      `/public/seo/:route` yang tidak dipakai frontend legacy; route lama tetap dipertahankan
      sebagai alias).
- [x] `LEGACY_MAPPING.md` — tabel 160 baris: method + path legacy → operationId v1 → perubahan
      bentuk respons. Tidak boleh ada baris kosong.
- [x] Tooling: `contract:lint` (Redocly/Spectral, 0 error), `contract:generate`
      (`openapi-typescript` → `packages/api-contract/generated/schema.d.ts`, diimpor web sebagai
      `@indobraga/api-contract`).
- [ ] Review kontrak bersama Dimas sebelum PLAN-02 dimulai (gate). — _belum — kontrak direvisi 2026-09-27 (paritas legacy); menunggu review Dimas_

## 1.7 Baseline legacy (acuan paritas)

Direkam **sebelum** apa pun diubah. Konten publik diambil dari produksi (GET read-only). Halaman
admin diambil dari legacy lokal yang diisi **dataset sintetis** — dataset yang sama persis kemudian
menjadi fixture mock PLAN-02, sehingga screenshot admin lama vs baru membandingkan data yang
identik dan tidak ada data pribadi yang disentuh.

> AMANDEMEN OWNER (2026-09-26): item screenshot Playwright (publik 7 route × 4 viewport +
> state, admin 18 halaman × 2 viewport) dan snapshot visual dibatalkan; tooling browser
> dihapus dari repo. Baseline yang dipertahankan: dataset sintetis, fixture JSON publik +
> admin, SEO head, inventaris URL, header respons, statistik DB, Lighthouse (bila tooling
> tersedia) — paritas visual diganti UAT manual terhadap produksi.

- [x] **Dataset sintetis** `apps/web/e2e/datasets/synthetic/` (SQL untuk skema legacy + README): — _dipulihkan ke `analysis/000-legacy-inventory/synthetic-dataset/` (folder e2e dihapus amandemen); kurang: partner < 26, user 2, akun email 3_
      mencakup setiap resource admin dengan variasi status (draf, tayang, arsip, nonaktif), jumlah
      baris cukup untuk pagination (≥ 26 per list utama), 2 user (super admin & content editor),
      akun email Google & SMTP (token/secret dummy terenkripsi dengan key dev), kampanye di setiap
      status + penerima + log, template, inquiry & prospek WhatsApp di setiap status, notifikasi
      read/unread, media completed/failed/archived. Nama/email/telepon fiktif.
- [x] Muat dataset ke DB legacy lokal (`prisma migrate deploy` lalu import SQL).
- [ ] Setup Playwright di `apps/web/e2e/` (konfigurasi dipakai ulang PLAN-02/04/05): Chromium, — _dibatalkan — amandemen owner (tooling browser dikeluarkan)_
      locale `id-ID`, timezone `Asia/Jakarta`, `animations: "disabled"`, `reducedMotion` diatur per
      test, font menunggu `document.fonts.ready`, **jam dibekukan** (`page.clock`) pada waktu tetap
      yang sama untuk baseline dan untuk test PLAN-02 (teks waktu relatif identik).
- [ ] **Screenshot publik** (produksi): 7 route × 4 viewport (375×812, 768×1024, 1280×800, — _dibatalkan — amandemen owner_
      1920×1080), full page. State tambahan: modal portofolio terbuka (gambar 1 & 2), lightbox galeri,
      modal WhatsApp FAB, filter kategori aktif, setelah "Muat lagi", `/berita?page=2`, detail berita,
      form kontak (error validasi & sukses via intercept), skeleton loading.
- [ ] **Screenshot admin** (legacy lokal): 18 halaman admin + login × 2 viewport (390×844, — _dibatalkan — amandemen owner_
      1440×900): list, modal create/edit, confirm dialog, dropdown notifikasi, drawer mobile,
      email-blast tab single & bulk (setelah import XLSX), preview email, detail riwayat email.
- [x] **Fixture API**: respons semua endpoint publik (produksi) disimpan sebagai JSON
      di `apps/web/src/mocks/fixtures/legacy-public/`; respons semua endpoint admin dari legacy lokal
      (dataset sintetis) di `apps/web/src/mocks/fixtures/legacy-admin/`. Keduanya masih berbentuk
      envelope legacy; converter ke envelope v1 ditulis di PLAN-02 §2.3.
- [ ] Gambar yang dipakai fixture diunduh ke `apps/web/e2e/assets/` agar visual test deterministik — _dibatalkan — amandemen owner_
      (tidak bergantung jaringan).
- [x] **SEO head** per URL publik (HTML mentah via curl): title, meta, canonical, OG, JSON-LD
      → `analysis/000-legacy-inventory/seo-baseline.json`.
- [x] **Inventaris URL**: semua URL di sitemap + hasil crawl link internal
      → `analysis/000-legacy-inventory/url-inventory.txt`.
- [ ] **Lighthouse** mobile & desktop untuk 7 route publik → `analysis/000-legacy-inventory/lighthouse/`. — _sebagian: 6 dari 7 route (`/kontak` belum)_
- [ ] **Header respons** produksi (security headers, cache-control, compression) untuk `/`, — _sebagian: 2 dari 4 URL_
      `/assets/*`, `/api/v1/public/home`, `/sitemap.xml` → `analysis/000-legacy-inventory/headers.txt`.
- [ ] Versi MySQL produksi (`SELECT VERSION()`), ukuran per tabel, dan jumlah baris per tabel → — _sebagian: statistik DB baseline sintetis; statistik produksi belum (butuh akses read-only DB produksi)_
      `analysis/000-legacy-inventory/db-stats.md` (dipakai PLAN-05).

## 1.8 CI dasar (GitHub Actions)

- [x] Workflow `ci.yml` pada PR & push `main`: — _ditulis; langkah test dinonaktifkan (testing ditangguhkan)_
  - web: `npm ci`, lint, typecheck, `vitest run`, `vite build`.
  - api: `go vet`, `golangci-lint`, `go test -race ./...`, `govulncheck`, `sqlc diff`
    (hasil generate harus sama dengan yang di-commit).
  - contract: `contract:lint`, `contract:generate` + cek tidak ada diff.
  - docker: build image (tanpa push).
- [ ] Waktu CI < 10 menit; cache npm & Go module. — _belum terverifikasi — workflow baru berjalan saat PR/push `main`_

## 1.9 Verifikasi standar

- [ ] Jalankan Final Checklist skill monorepo-standard satu per satu; semua "ya". — _belum_
- [x] `analysis/README.md` ada; tidak ada folder `docs/` paralel.
- [x] `MODULE_MAP.md` punya kolom owned tables & external integrations.
- [x] `.env` tidak ter-commit; `.gitignore` mencakup `.env`, `tmp/`, `dist/`, `coverage/`
      (entri laporan Playwright dihapus menyusul amendemen: tooling browser dikeluarkan).

---

## Deliverable

| Artefak | Lokasi |
|---|---|
| Repo + scaffold + toolchain | root, `apps/`, `packages/`, `infra/`, `scripts/` |
| Knowledge & rules | `CLAUDE.md`, `knowledge/`, `.claude/rules/` |
| ADR-0004..0013 | `knowledge/decisions/` |
| Kontrak API v1 + mapping legacy | `packages/api-contract/` |
| Baseline legacy | `apps/web/e2e/` (snapshot), `apps/web/src/mocks/fixtures/legacy-public/`, `analysis/000-legacy-inventory/*` |
| CI | `.github/workflows/ci.yml` |

## Definition of Done

- [x] `npm run dev:web` dan `npm run dev:api` jalan terpisah dari root; health `success:true`.
- [ ] CI hijau di `main`. — _belum — perubahan masih di branch `feat/plan-01-02`_
- [ ] Semua ADR-0004..0013 ditulis dan disetujui Dimas. — _ditulis; menunggu persetujuan Dimas_
- [x] `openapi.yaml` lint 0 error, `LEGACY_MAPPING.md` 160/160 baris terisi, tipe TS ter-generate.
- [ ] Baseline lengkap: screenshot publik & admin, fixture, SEO head, URL inventory, Lighthouse, — _sebagian — screenshot dibatalkan amandemen; Lighthouse & header belum lengkap_
      header, statistik DB.
- [ ] Final Checklist standar lulus. — _belum_
- [x] Repo legacy bersih kembali (§1.0) dan tidak ada perubahan lain di legacy.

## Risiko & mitigasi

| Risiko | Mitigasi |
|---|---|
| Data pribadi produksi bocor ke repo | Baseline admin memakai dataset sintetis; hanya SQL sintetis di `apps/web/e2e/datasets/synthetic/` yang boleh di-commit (`.gitignore` menolak `*.sql*` di luar folder itu); review diff sebelum commit |
| Kontrak 160 endpoint tidak akurat | Generator untuk resource generik, `LEGACY_MAPPING.md` wajib lengkap, verifikasi silang ke kode legacy per modul |
| Tool Go (Air, sqlc) bermasalah di Windows | Wrapper per-OS (§1.3), binary rilis resmi, CI Linux sebagai acuan |
| Screenshot baseline tidak stabil (animasi, font, gambar jaringan) | Animasi dimatikan, font ditunggu, gambar lokal, viewport & locale dikunci |
| Ukuran snapshot membengkak | Git LFS, hanya state yang tercantum di §1.7 |
