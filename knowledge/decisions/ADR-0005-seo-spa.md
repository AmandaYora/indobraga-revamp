# ADR-0005: SEO untuk SPA — head & data awal disisipkan Go

## Status
Accepted — 2026-09-26 (dipilih Dimas dari tiga opsi)

## Context
Legacy di-render di server (TanStack Start + Nitro): HTML pertama halaman publik sudah berisi konten,
title, meta, OG, canonical, dan JSON-LD. Standar monorepo mewajibkan SPA React yang dilayani backend
dalam satu container. Baseline Lighthouse legacy (beranda, desktop): Performance 94, SEO 100,
LCP 1,5 dtk.

## Decision
Go (modul `site`) menyajikan `index.html` hasil build Vite yang berisi placeholder
`<!--app-head-->` dan `<!--app-bootstrap-->`:

1. **Head per route publik**: title, description, robots, **tepat satu** canonical, OG & Twitter,
   JSON-LD (Organization + WebSite di semua halaman publik; Article di detail berita). Default diambil
   dari pengaturan admin (BC-21). Tag diberi atribut `data-server-seo` agar diganti komponen
   `<Seo>` di client tanpa duplikat (BC-20).
2. **Bootstrap data**: JSON (`site_settings`, `seo`, `page`, `path`) di
   `<script id="__INDOBRAGA_BOOTSTRAP__" type="application/json">`, di-escape aman (`<`, `>`, `&`,
   U+2028, U+2029). SPA memakainya untuk render pertama tanpa waterfall API (BC-23).
3. **Preload**: gambar LCP (`fetchpriority="high"`), `modulepreload` chunk route, dan font dari
   manifest Vite.
4. **Status HTTP**: route/slug tidak dikenal → 404 + noindex (BC-22). `/login`, `/admin/*` →
   noindex tanpa canonical, `Cache-Control: no-store`.
5. **Satu sumber SEO**: logika SEO hanya di Go; client memakai `GET /api/v1/public/seo?path=` saat
   navigasi.
6. **Cadangan**: bila Search Console menunjukkan regresi indexing setelah cutover, tambahkan snapshot
   HTML semantik konten di dalam `#root` (opsi B) lewat ADR amandemen.

## Alternatives rejected
- *SPA + snapshot HTML sejak awal*: 7 template Go yang harus selalu sinkron dengan komponen React.
- *Tetap SSR Node di container*: dua runtime, melanggar standar monorepo.

## Consequences
- Preview WhatsApp/Facebook & indeks Google terjaga; konten body dirender JavaScript.
- Target performa ≥ baseline dibuktikan dengan Lighthouse CI di PLAN-04.
- `robots.txt`/`sitemap.xml` dilayani Go, bukan frontend.
