# ADR-0013: Topologi deploy

## Status
Accepted — 2026-09-26 (provisioning & finalisasi di PLAN-04)

## Context
Legacy: satu VPS, PM2 menjalankan dua proses Node (API :3001, web SSR :3000), Nginx + Let's Encrypt,
MySQL di host, deploy lewat SSH + `git` + `npm ci` + build di server. Revamp menjadi repo sendiri dan
berjalan di **VPS baru**.

## Decision
- **Satu container aplikasi** (image multi-stage: build web statis + binary Go statis) melayani
  `/api/v1/*`, SPA shell + aset (`PUBLIC_DIR`), `robots.txt`, `sitemap.xml` di port 8080 yang hanya
  terbuka di loopback.
- **MySQL 8 di host** (bukan Docker); container terhubung via `host.docker.internal`.
- **Nginx di host**: TLS Let's Encrypt, redirect HTTP→HTTPS dan perilaku `www` sama dengan legacy,
  `client_max_body_size` untuk upload 100 MB, lokasi SSE (`proxy_buffering off`, read timeout 1 jam),
  gzip + brotli, header IP asli.
- **Image di GHCR**, dibangun GitHub Actions; deploy staging otomatis dari `main`, produksi dengan
  approval manual; rollback = deploy tag image sebelumnya (migration expand/contract).
- Staging dan produksi di VPS baru yang sama sebagai dua compose project terpisah (DB, prefix S3, env
  berbeda); staging tidak terindeks.
- Backup `mysqldump` harian + sebelum deploy produksi, retensi 14 hari + salinan offsite terenkripsi,
  uji restore bulanan.

## Alternatives rejected
- *Container terpisah web & api*, *DB di Docker*, *Kubernetes*: dilarang/anti-overengineering standar.
- *Build di server seperti legacy*: lambat, tidak reproducible, butuh toolchain di produksi.

## Consequences
- Server produksi tidak butuh Node/Go; cukup Docker, Nginx, MySQL.
- Proses tunggal → state in-memory (rate limit, SSE, cache) konsisten (ADR-0009).
