# PLAN-04 — Integrasi, Hardening & Kesiapan Produksi

> **PENUNDAAN TESTING — keputusan owner 2026-09-27.** Seluruh pekerjaan pengujian ditunda di
> semua plan: menulis/menjalankan test unit, komponen, page, kontrak (validasi mock), E2E,
> visual regression, aksesibilitas otomatis, coverage gate, load/performance test, security scan
> dinamis, skenario INT, dan verifikasi berbasis test. Butir checklist/DoD yang mensyaratkan test
> **bukan syarat selesai** sampai owner mengaktifkannya kembali. Pemeriksaan statis tetap wajib
> karena bukan pengujian: typecheck, lint, format, build, lint & mapping kontrak, `go vet`,
> `golangci-lint`, `govulncheck`. Test yang sudah ada dibiarkan di repo, tidak dijalankan di CI.

## Tujuan

Menyatukan frontend (PLAN-02) dan backend (PLAN-03) menjadi satu aplikasi yang **terintegrasi
sempurna, tanpa bug yang diketahui, ideal, dan optimal**, lalu menyiapkan **VPS baru** (staging +
wadah produksi) sehingga PLAN-05 tinggal memindahkan data dan mengalihkan DNS.

Hasil yang harus terbukti:
1. Semua test PLAN-02 (E2E, visual, a11y) lulus terhadap **backend Go nyata** — bukan mock.
2. Skenario yang tidak bisa di-mock (S3, SMTP, Gmail, SSE via Nginx, worker, restart DB/container)
   lulus di staging.
3. Performa ≥ baseline legacy; keamanan terverifikasi; 0 bug P0/P1/P2.
4. Staging di VPS baru berjalan dengan CI/CD, backup, monitoring.

**Di luar lingkup:** migrasi data produksi & cutover DNS (PLAN-05).

## Prasyarat

- [ ] DoD PLAN-02 dan PLAN-03 terpenuhi.
- [ ] Dimas menyediakan VPS baru (spesifikasi minimal disepakati: ≥ 2 vCPU, ≥ 4 GB RAM, SSD ≥ 40 GB,
      Ubuntu LTS) dan akses DNS untuk subdomain staging.
- [ ] Kredensial S3 baru khusus revamp (bukan kredensial legacy), akun Gmail uji, mailbox SMTP uji.

---

## 4.1 Integrasi lokal (tanpa mock)

- [ ] Jalankan `npm run dev:api` + `npm run dev:web` (proxy Vite, `VITE_API_MOCK` tidak aktif),
      MySQL lokal berisi `apps/api/testdata/synthetic/` (data identik fixture MSW), storage driver lokal.
- [ ] **Live contract check**: saat E2E terhadap backend nyata, setiap respons `/api/*` yang diterima
      browser divalidasi terhadap `openapi.yaml` (hook Playwright `page.on("response")`). Pelanggaran
      = test merah.
- [ ] Setiap ketidakcocokan dicatat sebagai GitHub issue berlabel `integration`. Aturan perbaikan:
      kontrak adalah sumber kebenaran → sisi yang menyimpang yang diperbaiki; bila kontraknya yang
      salah → PR kontrak dulu, regenerate tipe, lalu kedua sisi.
- [ ] Hapus kode sementara yang hanya ada untuk mock (bila ada) dari jalur produksi.

## 4.2 Build produksi satu container

- [ ] `infra/docker/Dockerfile` final:
  - Stage web: `node:22-alpine`, `npm ci`, `npm run build:web` (manifest Vite aktif).
  - Stage api: Go stabil, `CGO_ENABLED=0`, `-trimpath`, `-ldflags "-s -w -X main.version=<sha>"`,
    tzdata tertanam (`time/tzdata`) untuk batas hari Asia/Jakarta.
  - Runtime: image minimal (distroless static atau alpine), user non-root, `PUBLIC_DIR=/app/public`,
    `EXPOSE 8080`, `HEALTHCHECK` memakai subcommand binary (`/app/api healthcheck`).
  - Migration tertanam (golang-migrate + `embed`): `/app/api migrate up` — host tidak perlu CLI migrate.
  - Target ukuran image < 60 MB; scan Trivy 0 temuan critical/high yang bisa diperbaiki.
- [ ] `docker-compose.yml`: hanya service `app`, `env_file: .env`, `extra_hosts:
      host.docker.internal:host-gateway`, port `127.0.0.1:8080:8080` (hanya Nginx yang terbuka ke
      publik), `restart: unless-stopped`, rotasi log json-file, `stop_grace_period: 30s`.
- [ ] Jalankan suite E2E lengkap terhadap container lokal (mode produksi) + MySQL host.

## 4.3 Regresi penuh di stack nyata

- [ ] Seluruh suite PLAN-02 (E2E, visual vs baseline legacy, a11y) hijau terhadap container.
- [ ] E2E lintas browser untuk alur inti: Chromium, Firefox, WebKit; emulasi iPhone & Android.
      (Perbandingan visual terhadap baseline legacy tetap Chromium.)
- [ ] Skenario khusus integrasi (di staging, §4.6):

| ID | Skenario | Kriteria lulus |
|---|---|---|
| INT-01 | Upload gambar nyata → pipeline → S3 (prefix staging) → tampil di publik & admin | 3 varian ada di bucket, URL benar, gambar tampil |
| INT-02 | Inquiry publik dari context browser lain → notifikasi admin via SSE lewat Nginx | muncul ≤ 2 dtk; heartbeat tetap hidup 30 menit |
| INT-03 | Rate limit di balik Nginx | percobaan login ke-6/menit dari 1 IP → 429; IP lain tidak terdampak |
| INT-04 | Sesi: kedaluwarsa, logout, ganti password & nonaktifkan user mencabut sesi | sesuai aturan PLAN-03 §3.4 |
| INT-05 | CSRF: request mutasi tanpa/beda token | 403 |
| INT-06 | Kampanye end-to-end via SMTP uji (100 penerima uji) | semua terkirim, tanpa duplikat, agregat benar |
| INT-07 | Gmail OAuth nyata dengan akun uji + kirim; paksa token kedaluwarsa | refresh otomatis (BC-01), tetap connected |
| INT-08 | Email notifikasi inquiry ke mailbox uji (worker terjadwal, BC-02) | terkirim; `notification_status = sent` |
| INT-09 | Matikan container di tengah kampanye → start lagi | tidak ada kirim ganda; kampanye selesai |
| INT-10 | Restart MySQL saat aplikasi jalan | health sempat degraded/503 lalu pulih sendiri tanpa restart app |
| INT-11 | SEO shell: curl setiap URL publik | status benar, tepat 1 canonical, OG lengkap, JSON-LD valid (validator schema.org), bootstrap ada; 404 untuk path/slug tidak ada |
| INT-12 | Head vs baseline legacy (`seo-baseline.json`) | title/description identik kecuali perubahan BC-20/21 yang tercatat |
| INT-13 | `robots.txt` & `sitemap.xml` | himpunan URL identik legacy (dengan data yang sama) |
| INT-14 | Inventaris URL legacy (`url-inventory.txt`) | setiap URL → 200 (atau 404 yang disengaja, tercatat) |
| INT-15 | Export CSV audience | format byte-for-byte sesuai spesifikasi (BOM, CRLF, quoting, kolom) |
| INT-16 | Upload berbahaya (polyglot, bom dekompresi, ekstensi palsu, > 100 MP) | ditolak dengan kode benar, server stabil |

## 4.4 Performa & optimasi

Target (per route publik, mobile & desktop, dibanding baseline `analysis/000-legacy-inventory/lighthouse/`):

| Metrik | Target |
|---|---|
| Lighthouse Performance / Accessibility / Best Practices / SEO | ≥ skor legacy per route (beranda desktop legacy: 94 / 98 / 96 / 100) |
| LCP | ≤ legacy (beranda desktop legacy 1,5 dtk); mobile ≤ 2,5 dtk |
| CLS | ≤ 0,02 |
| TBT | ≤ 50 ms |
| INP | kategori "good" |
| API publik (k6, 100 RPS) | p95 < 150 ms, error 0% |
| API admin list (k6) | p95 < 300 ms |
| SSE | 50 koneksi stabil 30 menit |
| Soak 1 jam | memori stabil (tanpa kebocoran), 0 error |

- [ ] Teknik yang wajib terverifikasi: bootstrap data (tanpa waterfall API di load pertama), preload
      gambar LCP dengan `srcset/sizes`, `modulepreload` chunk route, preload font self-host, cache
      immutable `/assets/*`, kompresi gzip + brotli, `loading="lazy"` & `decoding="async"` untuk gambar
      di bawah lipatan, library admin berat (XLSX) lazy.
- [ ] Bundle: tidak ada chunk > 250 KB gzip; JS awal route publik ≤ legacy.
- [ ] Database: `EXPLAIN` setiap query list/search/count; tidak ada full scan pada tabel yang tumbuh
      (leads, audit, media, notifikasi, penerima, log kirim); slow query log staging (ambang 200 ms)
      kosong selama load test.
- [ ] Lighthouse CI di GitHub Actions terhadap staging dengan budget di atas (gagal bila turun).

## 4.5 Keamanan

- [ ] Header keamanan dibandingkan dengan `headers.txt` legacy (tidak boleh lebih lemah).
- [ ] CSP: jalankan mode report-only selama seluruh suite E2E di staging → 0 pelanggaran → aktifkan
      enforce. Periksa khusus: sonner, Radix, iframe preview email (sandbox), gambar dari host media.
- [ ] Matriks otorisasi otomatis: setiap endpoint admin × {anonim, content_editor, super_admin}
      dijalankan terhadap staging, hasil sesuai `x-permission` di kontrak.
- [ ] OWASP ZAP baseline scan terhadap staging → 0 temuan high/medium yang belum ditangani.
- [ ] `govulncheck` 0, `npm audit --omit=dev` 0 high/critical, Trivy image 0 critical/high fixable,
      gitleaks di CI (tidak ada secret di repo maupun layer image).
- [ ] Cookie di HTTPS staging: `Secure`, `HttpOnly` (sesi), `SameSite=Lax`.
- [ ] Rate limit memakai IP klien asli (konfigurasi `TRUSTED_PROXIES` + header Nginx benar).
- [ ] Review penuh: `/security-review` pada seluruh codebase + `/code-review` level high; semua temuan
      ditutup atau diterima eksplisit.

## 4.6 VPS baru: provisioning, staging, wadah produksi

Semua langkah dicatat di `knowledge/DEPLOYMENT.md` dan diskrip di `infra/scripts/` agar bisa diulang.

- [ ] **Host**: Ubuntu LTS, user deploy non-root, SSH key saja (password login off), ufw (22, 80,
      443), fail2ban, unattended-upgrades, NTP, timezone UTC, swap bila RAM kecil.
- [ ] **MySQL 8 di host** (bukan Docker): bind ke `127.0.0.1` + bridge Docker saja, user aplikasi
      least-privilege per database, `utf8mb4_unicode_ci`, `slow_query_log`, `innodb_buffer_pool_size`
      disetel, `wait_timeout` dicatat (sinkron dengan `ConnMaxLifetime`).
- [ ] **Backup**: `mysqldump --single-transaction` harian + sebelum setiap deploy produksi, retensi
      14 hari lokal + salinan offsite terenkripsi (prefix/bucket terpisah), **uji restore bulanan**
      (dijadwalkan, hasil dicatat).
- [ ] **Docker Engine + compose plugin**, rotasi log.
- [ ] **Nginx**: TLS Let's Encrypt, HTTP → HTTPS, perilaku `www`/apex **sama dengan legacy** (cek
      baseline redirect), proxy ke `127.0.0.1:8080`, `client_max_body_size 110m`, lokasi SSE
      (`proxy_buffering off`, `proxy_read_timeout 1h`), gzip + brotli, header real IP, tidak menduplikasi
      header keamanan yang sudah diset aplikasi.
- [ ] **Egress**: verifikasi port keluar 465/587 ke SMTP Hostinger dan 443 ke Google API & S3
      (sebagian penyedia VPS memblokir SMTP) dengan `openssl s_client`.
- [ ] **Staging** `staging.indobraga.com` (atau subdomain yang disepakati): compose project
      `indobraga-staging` port 8081, DB `indobraga_staging`, prefix S3 `upload/staging`, email mode
      mock atau mailbox uji, basic auth/IP allowlist, `X-Robots-Tag: noindex` + robots disallow all.
      Redirect URI OAuth staging ditambahkan Dimas di Google Cloud Console.
- [ ] **Wadah produksi** (belum menerima trafik): compose project `indobraga` port 8080, DB `indobraga`
      (skema termigrasi, kosong), env `/opt/indobraga/.env` (izin 600), prefix S3 `upload/prod`
      (sama dengan legacy — media bersama, ADR-0008).
- [ ] **Monitoring**: uptime monitor eksternal untuk `/` dan `/api/v1/health` (staging & produksi),
      alert disk/memori, notifikasi ke email Dimas.

## 4.7 CI/CD

- [ ] PR: CI penuh (PLAN-01 §1.8) + E2E terhadap container dengan MySQL service container (hanya di CI).
- [ ] Push `main`: build image → push GHCR (tag `sha` + `staging`) → deploy staging otomatis via SSH:
      `pull` → `migrate up` → `up -d` → smoke test → rollback otomatis ke tag sebelumnya bila smoke gagal.
- [ ] Produksi: GitHub Environment `production` dengan approval manual; backup DB sebelum deploy;
      skrip sama dengan staging.
- [ ] Aturan migration **expand/contract**: setiap migration kompatibel dengan versi aplikasi
      sebelumnya, sehingga rollback aplikasi tidak butuh `migrate down`.
- [ ] Tag rilis semver + catatan rilis.

## 4.8 Bug bash, UAT, dan gerbang nol bug

- [ ] Severitas: **P0** data hilang/keamanan/down; **P1** fitur rusak; **P2** perilaku salah dengan
      workaround atau selisih visual; **P3** kosmetik minor.
- [ ] Sesi eksplorasi per role di staging memakai checklist PLAN-02 §2.8 + kasus tepi: data kosong,
      teks sangat panjang, karakter khusus & emoji, jaringan lambat (3G), offline sesaat, back/forward,
      multi-tab, sesi habis saat mengedit, double submit, upload bersamaan.
- [ ] UAT oleh Dimas di staging (data sintetis): checklist per modul di `plans/UAT.md` (dibuat di fase
      ini), ditandatangani per modul.
- [ ] `/simplify` pada modul yang punya duplikasi; dokumentasi `knowledge/` final.
- [ ] **Gerbang**: 0 bug P0/P1/P2 terbuka; P3 hanya dengan persetujuan eksplisit Dimas.

## Definition of Done

- [ ] Suite PLAN-02 lengkap + INT-01..INT-16 hijau terhadap staging.
- [ ] Semua target §4.4 tercapai (bukti: laporan Lighthouse CI, k6, EXPLAIN).
- [ ] Semua butir §4.5 hijau; CSP enforce aktif.
- [ ] Staging & wadah produksi di VPS baru siap; backup + uji restore pertama sukses; monitoring aktif.
- [ ] CI/CD staging otomatis & produksi dengan approval berjalan; rollback image teruji sekali.
- [ ] UAT ditandatangani; gerbang nol bug terpenuhi.
- [ ] `knowledge/DEPLOYMENT.md` lengkap (provisioning, deploy, rollback, backup/restore, monitoring).

## Risiko & mitigasi

| Risiko | Mitigasi |
|---|---|
| Mock menutupi perbedaan perilaku backend | Live contract check di E2E nyata; subset E2E sudah dijalankan di akhir PLAN-03 |
| SSE/timeout putus di Nginx | Konfigurasi lokasi khusus + INT-02 durasi 30 menit |
| Penyedia VPS memblokir SMTP | Cek egress lebih awal (§4.6); alternatif: port submission lain atau relay yang diizinkan |
| CSP memblokir library UI | Report-only dulu, enforce setelah 0 pelanggaran |
| Performa SPA di bawah SSR legacy | Bootstrap data + preload LCP + budget Lighthouse CI; cadangan snapshot HTML (ADR-0005) |
| Staging terindeks Google | noindex header + robots + basic auth |
