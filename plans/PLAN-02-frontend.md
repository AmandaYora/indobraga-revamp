# PLAN-02 — Revamp Frontend (`apps/web`)

> **PENUNDAAN TESTING — keputusan owner 2026-09-27.** Seluruh pekerjaan pengujian ditunda di
> semua plan: menulis/menjalankan test unit, komponen, page, kontrak (validasi mock), E2E,
> visual regression, aksesibilitas otomatis, coverage gate, load/performance test, security scan
> dinamis, skenario INT, dan verifikasi berbasis test. Butir checklist/DoD yang mensyaratkan test
> **bukan syarat selesai** sampai owner mengaktifkannya kembali. Pemeriksaan statis tetap wajib
> karena bukan pengujian: typecheck, lint, format, build, lint & mapping kontrak, `go vet`,
> `golangci-lint`, `govulncheck`. Test yang sudah ada dibiarkan di repo, tidak dijalankan di CI.

## Tujuan

Membangun ulang frontend Indobraga sebagai **SPA React 19** sesuai Dimas Monorepo Standard
(react-router-dom lazy routes, Zustand, Zod, Axios, Tailwind 4, alias `@/*`, tema terpusat) dengan:

- **Paritas visual**: setiap halaman & state identik dengan baseline legacy (PLAN-01 §1.7), diukur
  dengan visual regression otomatis.
- **Paritas perilaku**: setiap interaksi legacy (inventaris `analysis/000-legacy-inventory/frontend.md`)
  ada dan teruji, ditambah perbaikan BC-20..BC-28.
- **Siap integrasi**: seluruh komunikasi API mengikuti kontrak v1 dan diuji terhadap kontrak
  (mock MSW yang divalidasi `openapi.yaml`), sehingga PLAN-04 tinggal mengganti mock dengan backend
  nyata.

**Di luar lingkup:** backend Go, SEO head injection sisi server (PLAN-03 §3.9), Lighthouse pada
stack nyata (PLAN-04).

## Prasyarat

- [ ] DoD PLAN-01 terpenuhi: kontrak v1 final + tipe TS ter-generate, baseline visual & fixture
      legacy, ADR-0004/0005/0010/0011/0012.
- [ ] Skill `frontend-design` tersedia (sudah terpasang) — dipakai sesuai ADR-0010.

> AMANDEMEN OWNER (2026-09-26): tooling browser/Playwright dikeluarkan dari repo
> (termasuk screenshot baseline & visual regression otomatis PLAN-01 §1.7).
> Paritas visual diganti UAT manual terhadap produksi + fixture JSON.
> Dependensi `@playwright/test` / `@axe-core/playwright` dan script `e2e` /
> `e2e:update` di §2.1 TIDAK berlaku sampai diputuskan sebaliknya; uji
> aksesibilitas dialihkan ke audit manual + `eslint-plugin-jsx-a11y` bila dipasang.

---

## 2.1 Stack & konfigurasi

- [ ] Dependensi runtime: `react@19`, `react-dom@19`, `react-router-dom` (v7, *data mode*:
      `createBrowserRouter`, `lazy`, `loader`, `errorElement`, `ScrollRestoration`), `zustand`,
      `zod`, `axios`, `tailwindcss@4` + `@tailwindcss/vite`, `tw-animate-css`, paket Radix yang sama
      dengan legacy (alert-dialog, dialog, dropdown-menu, scroll-area, slot),
      `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react` (**major/minor sama
      dengan legacy** agar ikon identik), `sonner`, `read-excel-file`, `write-excel-file`, font
      self-host `@fontsource-variable/inter` & `@fontsource-variable/plus-jakarta-sans` (BC-28).
- [ ] Dev: `vite@7`, `@vitejs/plugin-react`, `typescript`, ESLint 9 (+ typescript-eslint,
      react-hooks, react-refresh, jsx-a11y), Prettier, `vitest@4`, `@vitest/coverage-v8`, `jsdom`,
      `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`,
      `msw@2`, `@playwright/test`, `@axe-core/playwright`, validator OpenAPI untuk test (mis. AJV +
      loader OpenAPI 3.1).
- [ ] Dilarang: `@tanstack/*`, `@lovable.dev/*`, `nitro`, TanStack Query/Table (standar).
- [ ] `vite.config.ts`: plugin react + tailwind, alias `@` → `src`, proxy `/api` →
      `VITE_DEV_API_TARGET` (default `http://localhost:8080`), `build.manifest: true` (dipakai Go
      untuk `modulepreload` & preload font/chunk per route), `build.sourcemap: "hidden"`.
- [ ] `index.html`: `lang="id"`, charset, viewport, favicon + apple-touch-icon (`favico.png`),
      placeholder `<!--app-head-->` dan `<!--app-bootstrap-->` masing-masing **tepat sekali**, `#root`.
- [ ] `tsconfig`: `strict`, path `@/*`; hapus `"sideEffects": false` warisan legacy (atau batasi
      agar import CSS/font tidak ter-tree-shake).
- [ ] Script: `dev`, `dev:mock` (`VITE_API_MOCK=true`), `build`, `preview`, `lint`, `typecheck`,
      `test`, `test:coverage`, `e2e`, `e2e:update` (hanya untuk snapshot state baru, bukan baseline
      legacy).

## 2.2 Struktur & pemetaan file legacy

```txt
src/
├── app/            App.tsx, providers/ (AppProvider: Toaster, ErrorBoundary; RouterProvider),
│                   routes/ (index.tsx, public.routes.tsx, protected.routes.tsx, route-paths.ts,
│                   admin-menu.ts)
├── modules/
│   ├── auth/           login, auth store, guard, permission helper
│   ├── site/           shell publik, site settings, SEO, kontak, Not Found, Pengaturan admin
│   ├── home/           beranda
│   ├── profile/        fasilitas (publik); hero, partner, keunggulan, mesin & kapasitas, layanan (admin)
│   ├── portfolio/      portofolio + modal (publik); portofolio & kategori (admin)
│   ├── gallery/        galeri + lightbox (publik); galeri (admin)
│   ├── news/           daftar & detail berita (publik); berita (admin)
│   ├── leads/          form inquiry, WhatsApp FAB; pesan kontak & prospek WhatsApp (admin)
│   ├── media/          upload, galeri media, media library, kompresi gambar
│   ├── content/        mesin ResourceManager generik (status, arsip, pagination, CRUD modal)
│   ├── email/          akun email, email blast, template, riwayat
│   ├── notifications/  bell, dropdown, SSE
│   ├── dashboard/      dashboard admin
│   └── users/          manajemen user
├── shared/         components/ui, components/feedback, layouts, services, stores, hooks, lib,
│                   types, constants
├── mocks/          handler MSW + fixture (hanya dev/test, tidak masuk bundle produksi)
├── theme/          colors.ts, theme.css, index.ts
├── styles/         globals.css
└── main.tsx
```

Setiap modul mengekspor API publiknya lewat `index.ts`; modul lain hanya mengimpor dari sana.

| Legacy | Baru |
|---|---|
| `routes/_public.index.tsx` | `modules/home/pages/HomePage.tsx` |
| `routes/_public.portfolio.tsx`, `components/public/PortfolioModal.tsx` | `modules/portfolio/pages/PortfolioPage.tsx`, `modules/portfolio/components/PortfolioModal.tsx` |
| `routes/_public.fasilitas.tsx` | `modules/profile/pages/FacilitiesPage.tsx` |
| `routes/_public.galeri.tsx` | `modules/gallery/pages/GalleryPage.tsx` + `components/GalleryLightbox.tsx` |
| `routes/_public.berita.tsx`, `_public.berita.$slug.tsx` | `modules/news/pages/NewsListPage.tsx`, `NewsDetailPage.tsx` (route **sibling**, bukan nested) |
| `routes/_public.kontak.tsx` | `modules/site/pages/ContactPage.tsx` + `modules/leads/components/InquiryForm.tsx` |
| `routes/_public.tsx`, `components/public/{PublicLayout,SiteHeader,SiteFooter}` | `shared/layouts/PublicLayout.tsx` + `modules/site/components/{SiteHeader,SiteFooter,BrandLogo}` |
| `components/public/WhatsAppFAB.tsx` | `modules/leads/components/WhatsAppFab.tsx` |
| `components/public/SiteSettingsContext.tsx`, `site-settings.ts` | `modules/site/stores/site-settings.store.ts` |
| `components/public/{PageHero,MediaPlaceholder,PublicSkeletons}` | `shared/components/ui/{PageHero,MediaPlaceholder}`, skeleton per modul + `shared/components/feedback` |
| `routes/login.tsx` | `modules/auth/pages/LoginPage.tsx` |
| `routes/admin.tsx`, `components/admin/AdminLayout.tsx` | `shared/layouts/AdminLayout.tsx` (menu dari `app/routes/admin-menu.ts`) + `modules/notifications/components/NotificationBell.tsx` |
| `routes/admin.index.tsx` | `modules/dashboard/pages/DashboardPage.tsx` |
| `routes/admin.{hero,partners,strength,services,machines}.tsx` | `modules/profile/pages/admin/*` |
| `routes/admin.{portfolio,portfolio-categories}.tsx` | `modules/portfolio/pages/admin/*` |
| `routes/admin.gallery.tsx`, `components/admin/MediaLibraryPanel.tsx` | `modules/gallery/pages/admin/GalleryAdminPage.tsx`, `modules/media/components/MediaLibraryPanel.tsx` |
| `routes/admin.news.tsx` | `modules/news/pages/admin/NewsAdminPage.tsx` |
| `routes/admin.{inquiries,whatsapp}.tsx`, `components/admin/LeadManager.tsx` | `modules/leads/pages/admin/*`, `modules/leads/components/LeadManager.tsx` |
| `routes/admin.email-*.tsx`, `components/admin/EmailContentEditor.tsx`, `routes/-admin.email-blast.helpers.ts` | `modules/email/pages/*`, `modules/email/components/EmailContentEditor.tsx`, `modules/email/lib/recipients.ts` |
| `routes/admin.settings.tsx`, `-admin.settings.helpers.ts` | `modules/site/pages/admin/SettingsPage.tsx`, `modules/site/lib/settings-form.ts` |
| `routes/admin.users.tsx` | `modules/users/pages/UsersPage.tsx` |
| `components/admin/AdminResourceManager*`, `CrudModal.tsx` | `modules/content/components/ResourceManager/*` (engine) + field generik di `shared/components/ui` |
| `components/admin/{MediaUploadField,MediaGalleryField}.tsx`, `lib/image-compression.ts` | `modules/media/components/*`, `shared/lib/image-compression.ts` |
| `components/admin/ui.tsx` | `shared/components/ui/{PageTitle,Card,Button variants,IconActionButton,Badge}`; `StatusBadge` → `Badge` generik (prop `tone`) + peta status per modul (aturan standar: shared UI tidak mengenal status domain) |
| `components/admin/{Pagination,ApiState}.tsx` | `shared/components/ui/Pagination.tsx`, `shared/components/feedback/{LoadingState,EmptyState,ErrorState}` |
| `components/ui/*` | `shared/components/ui/*` (isi sama; `components.json` diarahkan ke folder baru) |
| `components/DefaultErrorComponent.tsx` | `shared/components/feedback/RouteError.tsx` |
| `lib/api.ts`, `lib/user-facing-error.ts` | `shared/services/{http-client,api-error,csrf}.ts` |
| `lib/api-services.ts`, `lib/api-models.ts` | `modules/*/services/*.service.ts` + tipe dari `@indobraga/api-contract` |
| `hooks/use-api-query.ts` | `shared/hooks/useApiQuery.ts` (tambah abort saat unmount & guard respons basi) |
| `lib/{date,utils}.ts` | `shared/lib/{date,cn}.ts` |
| `lib/lead-contact.ts` | `modules/leads/lib/lead-contact.ts` |
| `lib/seo.ts` | `modules/site/lib/seo.ts` (hanya fallback; data SEO utama dari API) |
| `lib/public-fallbacks.ts`, `data/site.ts` | `modules/site/lib/fallbacks.ts` (dipertahankan: halaman tidak pernah kosong saat API gagal) |
| `lib/seo-assets.ts`, `routes/robots[.]txt.ts`, `routes/sitemap[.]xml.ts` | **dihapus** — disajikan Go (PLAN-03) |
| `routeTree.gen.ts`, `router.tsx`, `routes/__root.tsx` | **dihapus** — diganti `app/routes/*` + `index.html` |

## 2.3 Lapisan data & kontrak

- [ ] `shared/services/http-client.ts` (satu-satunya instance Axios):
  - `baseURL = VITE_API_BASE_URL || ""`, prefix `/api/v1`, timeout 30 dtk, cookie same-origin.
  - Request interceptor: header `x-csrf-token` dari cookie `VITE_CSRF_COOKIE_NAME` untuk
    POST/PUT/PATCH/DELETE (kecuali login).
  - Response interceptor: unwrap envelope v1 → `{ data, meta }`; error → `ApiError`
    `{ code, status, message, errors[], requestId }` dengan pesan Indonesia (port
    `user-facing-error`); network/timeout → `NETWORK_ERROR`.
  - 401 pada request admin (selain cek sesi awal) → `authStore.reset()` + redirect
    `/login?redirect=<path saat ini>`.
- [ ] Service per modul memakai tipe `@indobraga/api-contract` (tanpa tipe manual duplikat).
- [ ] Zod hanya di batas kepercayaan: form, search params, dan JSON bootstrap dari HTML.
- [ ] `shared/services/bootstrap.ts`: baca `<script id="__INDOBRAGA_BOOTSTRAP__"
      type="application/json">` sekali, validasi Zod, konsumsi satu kali untuk URL yang cocok, lalu
      hapus node-nya. Data: `site_settings`, `seo`, `page` (data halaman publik), `path`.
- [ ] `shared/hooks/useApiQuery.ts`: API sama dengan legacy (`data`, `error`, `loading`, `reload`,
      `setData`, opsi `enabled`/`initialData`/`refetchOnMount`) + `AbortController` + guard urutan
      respons. Tanpa cache global (anti-overengineering); data sesi & settings di store.
- [ ] **MSW** (`src/mocks/`):
  - Handler per modul, **stateful** (DB in-memory) sehingga CRUD, status, arsip, pagination
    offset & cursor, filter, search, login/logout (cookie), CSRF, permission per role, rate limit
    429 (opsional per test), error 4xx/5xx bisa disimulasikan.
  - SSE `/admin/notifications/stream` (pakai dukungan SSE MSW 2 bila tersedia — cek Context7; bila
    tidak, mock `EventSource` di test).
  - Seed: `scripts/fixtures/convert-legacy.mjs` mengubah `fixtures/legacy-public` &
    `fixtures/legacy-admin` (PLAN-01) ke envelope & field v1 (mis. `name`→`title` kampanye,
    status lowercase, `items/pagination` → `data/meta`).
  - Aktif hanya bila `VITE_API_MOCK=true` atau di test; dipastikan tidak ada di bundle produksi
    (test build: grep `msw` di `dist/` = 0).
- [ ] **Validasi kontrak mock**: test otomatis memvalidasi **setiap** respons handler MSW dan
      **setiap** body request yang dikirim frontend terhadap `openapi.yaml`. Mock yang menyimpang
      dari kontrak = test merah. `onUnhandledRequest: "error"`.

## 2.4 Tema & token desain

- [ ] Pindahkan `styles.css` legacy: token `:root` + `@theme inline` → `theme/theme.css`;
      import, base layer, utility custom (`.bg-gradient-*`, `.shadow-elegant/card`, `.text-balance`,
      `.text-anywhere`, `.animate-*`, `.skeleton-shimmer`), keyframes, `prefers-reduced-motion`
      → `styles/globals.css`. **Nilai identik** — test membandingkan setiap nilai token legacy vs baru.
- [ ] `theme/colors.ts` + `theme/index.ts` mengekspor nama token untuk pemakaian di TS.
- [ ] Warna yang di-hardcode di legacy dijadikan token dengan nilai yang sama: hijau WhatsApp,
      teks warning `oklch(.45 .15 75)`, `emerald-600` → `--color-whatsapp`,
      `--color-warning-strong`, `--color-success-strong`.
- [ ] Palet `.dark` legacy tidak dibawa (tidak pernah aktif); dark mode masuk backlog.
- [ ] Font self-host (BC-28): weight Inter 400–700, Plus Jakarta Sans 600–800, `font-display: swap`,
      h1–h4 Plus Jakarta Sans, body Inter; preload woff2 utama disuntik Go dari manifest.

## 2.5 Routing

- [ ] `route-paths.ts`: konstanta + builder (`newsDetail(slug)`, `newsList(page)`, dsb.).
- [ ] Publik (di bawah `PublicLayout`): `/`, `/portfolio`, `/fasilitas`, `/galeri`, `/berita`,
      `/berita/:slug`, `/kontak`. Semua `lazy`, masing-masing punya `loader` yang memakai bootstrap
      (load pertama) atau memanggil API (navigasi) + data SEO secara paralel — padanan loader TanStack.
- [ ] `/login` (redirect ke `/admin` atau `?redirect=` bila sudah login — BC-25).
- [ ] `/admin/*` (18 halaman) di bawah loader guard `requireAuth` (`authStore.ensure()` sekali,
      dedupe in-flight — BC-26) → `AdminLayout`.
- [ ] `*` → halaman Not Found (desain dari sistem yang sama; state baru → `frontend-design`) — BC-22.
- [ ] Pending UI setara `pendingMs/pendingMinMs 300`: skeleton muncul hanya bila navigasi > 300 ms
      dan bertahan ≥ 300 ms (`DelayedFallback` berbasis `useNavigation`). Skeleton per route sama
      dengan legacy (`HomePendingPage`, `ArticleDetailSkeleton`, dst.).
- [ ] Search params ber-Zod: `/berita?page` (int ≥ 1, invalid → 1), `/admin/email-blast?tab=single|bulk&email&name`.
- [ ] `ScrollRestoration`; `NavLink` menggantikan `activeProps/activeOptions` (beranda exact).
- [ ] `errorElement` → `RouteError` dengan tombol coba lagi (`revalidator.revalidate()`).
- [ ] Link kembali dari detail berita mempertahankan `page` seperti legacy (verifikasi mekanisme
      persisnya di kode legacy).

## 2.6 SEO sisi client

- [ ] Komponen `<Seo>` (modul `site`) memakai metadata native React 19 (`<title>`, `<meta>`,
      `<link rel="canonical">`, `<script type="application/ld+json">`) dari payload SEO API/bootstrap.
- [ ] Tag dari server diberi atribut `data-server-seo`; setelah `<Seo>` pertama mount, tag server
      dihapus → tidak ada duplikat. Test: setelah load & setelah navigasi, tepat 1 `title`,
      1 `canonical` (publik), 1 set `og:*` (BC-20).
- [ ] `/login`, `/admin/*`: `robots noindex, nofollow`, tanpa canonical.
- [ ] Root default (dari API): Organization + WebSite JSON-LD, author, default title/description
      dari Pengaturan admin (BC-21) dengan fallback `modules/site/lib/seo.ts`.

## 2.7 State (Zustand)

| Store | Modul | Isi |
|---|---|---|
| `auth.store` | auth | user, permissions, status (`unknown`/`authenticated`/`anonymous`), `ensure()`, `login()`, `logout()`, `hasPermission()` |
| `site-settings.store` | site | settings publik; hidrasi dari bootstrap (BC-23); fetch sekali |
| `notifications.store` | notifications | unread count, daftar, siklus SSE (connect, heartbeat, reconnect backoff), fallback polling 120 dtk, mark read/all |
| `ui.store` | shared | drawer sidebar, query pencarian menu (BC-27) |

State lain tetap lokal (`useState`/`useReducer`).

## 2.8 Checklist paritas halaman

Setiap butir = minimal satu test (C = component, E = E2E, V = visual). ID dipakai di nama test.

### Shell publik
- [ ] FE-S01 Header: logo (atau inisial) sesuai `show_brand_text`, nav aktif, menu mobile (C, E, V).
- [ ] FE-S02 Footer: logo footer, kontak, Instagram, alamat (C, V).
- [ ] FE-S03 WhatsApp FAB: animasi ping, modal nama+telepon, `POST /public/whatsapp-leads`,
      `window.open(whatsapp_url)`, fallback `wa.me/{whatsapp}` saat API gagal (C, E, V).
- [ ] FE-S04 Site settings tersedia di paint pertama dari bootstrap (BC-23) (C, E).
- [ ] FE-S05 Fallback konten statis saat API gagal (C, E).
- [ ] FE-S06 Not Found + status 404 (status diuji di PLAN-04) (C, V).

### Beranda `/`
- [ ] FE-H01 Hero 2 gambar cross-fade 9 dtk, `animate-fade-up`, CTA (C, V).
- [ ] FE-H02 3 stat tile (C, V).
- [ ] FE-H03 Carousel logo klien 2 baris: prev/next `scrollBy`, edge fade, grayscale→warna saat hover (C, E, V).
- [ ] FE-H04 Grid keunggulan, 6 portofolio unggulan, mesin/kapasitas/layanan, 3 berita terbaru, CTA (V).
- [ ] FE-H05 Skeleton `HomePendingPage` (V).

### Portofolio `/portfolio`
- [ ] FE-P01 Chip filter kategori (state lokal) (C, E).
- [ ] FE-P02 Tampil 8, "Muat lagi" dengan cursor, badge jumlah gambar (C, E, V).
- [ ] FE-P03 `PortfolioModal`: panah, dots, keyboard ←/→, swipe 40 px, animasi zoom/fade, fokus terkunci (C, E, V).

### Fasilitas `/fasilitas`
- [ ] FE-F01 Keunggulan, total kapasitas bulanan terhitung, kapasitas cetak, mesin, layanan (C, V).

### Galeri `/galeri`
- [ ] FE-G01 Grid dengan tile ke-7 besar, overlay play video (V).
- [ ] FE-G02 Lightbox custom (buka/tutup/navigasi, video) (C, E, V).
- [ ] FE-G03 Reveal + cursor "Muat lagi" (C, E).

### Berita `/berita`, `/berita/:slug`
- [ ] FE-N01 Grid 6, pagination bernomor via `?page` (C, E, V).
- [ ] FE-N02 Detail artikel, paragraf, link kembali mempertahankan `page` (C, E, V).
- [ ] FE-N03 SEO artikel: `og:type=article`, `article:*`, JSON-LD Article (E).
- [ ] FE-N04 Slug tidak ada → Not Found (BC-22) (C, E).

### Kontak `/kontak`
- [ ] FE-K01 Info kontak dari settings (V).
- [ ] FE-K02 Form inquiry: validasi (nama 2–120, email, telepon `^[0-9+()\-\s]{7,30}$`, pesan 10–5000),
      honeypot `website` tersembunyi, banner sukses 4 dtk, toast error (C, E, V).

### Auth
- [ ] FE-L01 Login: email prefilled (paritas), error kredensial, 429 rate limit, redirect (BC-25) (C, E, V).
- [ ] FE-L02 Guard admin: sesi habis → `/login?redirect=`; kembali ke tujuan setelah login (E).
- [ ] FE-L03 Logout menghapus sesi & kembali ke login (E).

### Layout admin
- [ ] FE-A01 Sidebar 5 grup / 16 link, item aktif kuning, drawer mobile (C, E, V).
- [ ] FE-A02 Pencarian menu top bar (BC-27) (C, E).
- [ ] FE-A03 Bell notifikasi: badge unread, dropdown, SSE `notification.created`/`notification.read`,
      fallback polling 120 dtk, mark read / mark all, klik → route sesuai `resource_type` (C, E, V).

### Dashboard
- [ ] FE-D01 6 stat card, inquiry terbaru, kampanye terbaru (C, V).

### Mesin konten (dipakai 12 resource)
- [ ] FE-C01 Search, tab status Aktif/Tayang/Draf/Arsip, pagination 10/25/50/100 + ellipsis (C, E).
- [ ] FE-C02 Kartu mobile vs tabel desktop (V).
- [ ] FE-C03 CrudModal: field text, textarea, number, select (nilai numerik opsional), checkbox,
      media, media-multi, paragraphs, hidden; pesan validasi server per field (C, E).
- [ ] FE-C04 Toggle publish/draf; arsip, unarsip, hapus permanen via ConfirmDialog (C, E).
- [ ] FE-C05 Error domain ditampilkan dengan pesan aslinya (mis. publish portofolio tanpa gambar → 422) (C).

### Halaman konten admin
- [ ] FE-C10 Hero: 2 manager (`hero`, `hero-slides`), `hero_section_id` tersembunyi (E, V).
- [ ] FE-C11 Partner, Keunggulan, Layanan, Kategori portofolio (E, V).
- [ ] FE-C12 Portofolio: select kategori dari API, media-multi maks 10 + urut panah + gambar pertama
      = cover, featured, field SEO (C, E, V).
- [ ] FE-C13 Mesin: 3 manager (mesin, kapasitas cetak, kapasitas produksi) (E, V).
- [ ] FE-C14 Galeri: gambar/video + poster; Media Library (filter aktif/arsip/cleanup_failed; retry,
      arsip, unarsip, hapus; 24 item pertama) (C, E, V).
- [ ] FE-C15 Berita: field paragraf (split per baris), thumbnail & OG media, field SEO (C, E, V).

### Media
- [ ] FE-M01 Kompresi di browser: WebP q0.82 maks 1920 px; file asli dipakai bila hasil tidak lebih
      kecil atau tipe bukan jpeg/png/webp (unit).
- [ ] FE-M02 Upload dengan progres & error 413/415 berbahasa Indonesia (C, E).

### Leads
- [ ] FE-LD01 Pesan kontak & prospek WhatsApp: search, filter status, pagination server, edit status
      + catatan internal, arsip (C, E, V).
- [ ] FE-LD02 Aksi kirim email → buka email-blast dengan `?tab=single&email&name`; aksi WhatsApp →
      `wa.me` dengan normalisasi nomor (unit, E).

### Email
- [ ] FE-E01 Akun email: search, filter provider, pagination; Google OAuth (tab baru ke
      `authorization_url`, menangani query `connected/status/reason` saat kembali); SMTP create
      (default Hostinger 465 SSL/TLS), edit, reconnect, disable, hapus (422 bila dipakai kampanye) (C, E, V).
- [ ] FE-E02 Email blast tab Single & Bulk; pilih template & simpan sebagai template (C, E, V).
- [ ] FE-E03 `EmailContentEditor`: toggle text/HTML, chip variabel disisipkan di posisi kursor,
      preview dalam iframe sandbox (BC-24) (C, E).
- [ ] FE-E04 Import XLSX (dynamic import), unduh template XLSX, validasi baris, dedupe email, limit
      1.000, peringatan variabel hilang (unit dengan file fixture, E).
- [ ] FE-E05 Modal preview mengisi `{{var}}`; simpan draft, konfirmasi, kirim (C, E).
- [ ] FE-E06 Template: list/search/paginate, edit, hapus (C, E, V).
- [ ] FE-E07 Riwayat: search, filter status, pagination, polling 5 dtk hanya selama ada kampanye
      pending/processing dan tab terlihat; detail penerima + log (permission
      `email_campaign_logs.read`); resend failed (permission `email_campaigns.send`) (C, E, V).

### Pengaturan & user
- [ ] FE-ST01 Pengaturan: identitas/kontak, radio tampilan logo, SEO title/description, 4 upload media
      (logo navbar, logo footer, hero kontak, OG) (C, E, V).
- [ ] FE-U01 User: search, filter role, pagination, create dengan password sementara, edit dengan
      password baru opsional, aktif/nonaktif, hapus; aturan `content_editor` (tidak melihat & tidak
      bisa memberi `super_admin`), tidak bisa menonaktifkan/menurunkan diri sendiri (C, E, V).

## 2.9 Strategi test & quality gate

| Layer | Alat | Cakupan | Gate |
|---|---|---|---|
| Unit | Vitest (node) | port 16 test lib legacy + http-client, CSRF, error mapping, bootstrap reader (termasuk payload berbahaya), Zod schema, route builder, recipients XLSX, substitusi variabel, normalisasi nomor, kompresi gambar | 100% lulus |
| Component | Vitest + jsdom + Testing Library + user-event + MSW (node) | semua `shared/components`, semua komponen modul di §2.8 | 100% lulus |
| Page | Vitest + data router in-memory + MSW | setiap route: loader, pending, error, search params | 100% lulus |
| Kontrak | Validator OpenAPI | setiap respons handler MSW & setiap request frontend | 0 pelanggaran |
| E2E | Playwright + build `VITE_API_MOCK=true` | semua butir E di §2.8, per role (super admin, content editor, anonim) | 100% lulus, 0 flaky (jalankan 3× berturut) |
| Visual | Playwright `toHaveScreenshot` vs baseline legacy (PLAN-01 §1.7) | semua halaman × viewport × state baseline | `maxDiffPixelRatio ≤ 0.002`; setiap selisih > 0 ditinjau; hanya boleh karena BC, dicatat di `apps/web/e2e/VISUAL_DIFFS.md` |
| Aksesibilitas | `@axe-core/playwright` + uji keyboard | semua halaman, modal, dropdown, drawer | 0 pelanggaran serious/critical; skor tidak di bawah legacy (98) |
| Bundle | analisis `vite build` | JS awal route publik | ≤ ukuran JS client legacy untuk route yang sama (diukur dari baseline) |
| Statis | ESLint, `tsc --noEmit`, Prettier | seluruh `apps/web` | 0 error, 0 warning |
| Coverage | v8 | seluruh `src` kecuali `mocks/`, `shared/components/ui` hasil shadcn | lines ≥ 80%, branches ≥ 75%, functions ≥ 80% (legacy 70/65/60/70) |

Snapshot baseline legacy **tidak boleh** di-update dengan `--update-snapshots`; hanya state baru
(Not Found, BC) yang boleh punya snapshot baru, disetujui Dimas.

## 2.10 Fase implementasi

Setiap fase selesai = test fase itu hijau + visual parity halaman fase itu lulus.

| Fase | Isi | Ukuran |
|---|---|---|
| F1 Fondasi | 2.1, tema 2.4, `shared/components/ui` & feedback, http-client, bootstrap reader, MSW + converter fixture + validasi kontrak | M |
| F2 Shell publik | `PublicLayout`, header, footer, WhatsApp FAB, site settings store, `<Seo>`, Not Found | S |
| F3 Halaman publik | beranda → portofolio → fasilitas → galeri → berita → kontak (satu per satu, paritas visual per halaman) | L |
| F4 Auth & layout admin | login, auth store, guard, `AdminLayout`, pencarian menu, notifikasi + SSE | M |
| F5 Konten & media | mesin ResourceManager, CrudModal & field, media upload/gallery/library, 9 halaman konten admin | L |
| F6 Leads, dashboard, user, pengaturan | LeadManager, dashboard, users, settings | M |
| F7 Email | akun (OAuth/SMTP), template, blast (XLSX), riwayat (polling) | L |
| F8 Hardening | a11y, state kosong/error (`frontend-design`), budget bundle, bersih-bersih, `knowledge/FRONTEND.md` & `MODULE_MAP.md` diperbarui | S |

## Definition of Done

- [ ] Semua butir §2.8 tercentang dan punya test yang lulus.
- [ ] Semua gate §2.9 terpenuhi di CI (bukan hanya lokal).
- [ ] Visual regression: 0 selisih yang belum dijelaskan; `VISUAL_DIFFS.md` hanya berisi item BC.
- [ ] Tidak ada import `@tanstack/*`/`@lovable.dev/*`; tidak ada Axios instance selain `http-client`.
- [ ] Bundle produksi tanpa MSW & fixture.
- [ ] Final Checklist standar bagian frontend lulus (React 19, Tailwind 4, react-router-dom, lazy,
      Zustand, Zod, Axios, `@/*`, `frontend-design`, shared UI domain-agnostic, tema terpusat).
- [ ] `knowledge/FRONTEND.md`, `MODULE_MAP.md` (sisi web), dan ADR-0012 diperbarui.
- [ ] Demo `npm run dev:web` (mode mock) ditinjau & disetujui Dimas per halaman.

## Risiko & mitigasi

| Risiko | Mitigasi |
|---|---|
| Mock menyimpang dari kontrak → integrasi gagal di PLAN-04 | Validasi setiap request/respons MSW terhadap `openapi.yaml`; `onUnhandledRequest: "error"` |
| Perbedaan render kecil (font self-host, iframe preview) memicu diff visual | Toleransi kecil + review manual; font variable yang sama dengan Google Fonts; perbedaan sah dicatat sebagai BC |
| Perilaku waktu (polling 5 dtk, banner 4 dtk, cross-fade 9 dtk) sulit diuji | Fake timers di Vitest, `page.clock` di Playwright |
| Loader react-router berbeda semantik dengan TanStack (nested `/berita`) | Route detail dibuat sibling; test page untuk setiap loader |
| Scope creep "sekalian perbaiki" | Hanya BC yang disetujui; lainnya ke backlog di `plans/README.md` |
