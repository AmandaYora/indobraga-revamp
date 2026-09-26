# Inventaris Frontend Legacy (snapshot 2026-09-26)

> Snapshot read-only dari `indobraga/apps/web` (TanStack Start + TanStack Router + Nitro, React 19, Tailwind 4).
> Dokumen ini **tidak diedit lagi** (aturan `analysis/`). Verifikasi ulang ke kode legacy sebelum mengimplementasikan detail.
> Path di bawah relatif terhadap `indobraga/apps/web/`.

## 1. SSR di produksi

- Produksi **full SSR**: `@lovable.dev/vite-tanstack-config` + `nitro()` preset `node-server`, `start: node .output/server/index.mjs` (PM2, `127.0.0.1:3000`).
- `src/routes/__root.tsx`: `shellComponent` merender `<html lang="id"><head><HeadContent/></head><body>…<Scripts/></body>`; CSS via `import appCss from "../styles.css?url"`.
- `src/router.tsx`: `scrollRestoration: true`, `defaultPreloadStaleTime: 0`, `defaultErrorComponent`. Tidak ada hover preload.
- Loader berjalan di server untuk request pertama, lalu di browser saat navigasi. Hasil loader → `useApiQuery(..., { initialData, refetchOnMount: false })`. Jika API gagal → data fallback statis (`lib/public-fallbacks.ts`), halaman tidak pernah kosong.

| Route | Loader | Pending UI | head() |
|---|---|---|---|
| `/` | `home()` → fallback `fallbackHome` | `HomePendingPage`, pendingMs/MinMs 300 | pageSeo "/" |
| `/portfolio` | `portfolio({limit:24})` + `portfolioCategories()` | ya | pageSeo |
| `/fasilitas` | `facilities()` | ya | pageSeo |
| `/galeri` | `gallery({limit:24})` | ya | pageSeo |
| `/berita` | `validateSearch` (page int ≥1), `loaderDeps({page})`, `news({page,limit:6})` | ya | pageSeo; `{}` bila detail aktif |
| `/berita/$slug` | `newsDetail(slug)` → fallback `fallbackNewsDetail(slug)` (bisa null) | `ArticleDetailSkeleton` | title/description/og image dari data, `og:type=article`, `article:published_time/modified_time/section`, JSON-LD Article |
| `/kontak` | `siteSettings()` → fallback | – | pageSeo + `og:image = contact_hero_image_url` |
| `/login`, `/admin*` | – | – | pageSeo `noindex` |

- `beforeLoad` dan `createServerFn` **tidak dipakai**.
- Server routes: `routes/robots[.]txt.ts`, `routes/sitemap[.]xml.ts` (`server.handlers.GET` → `lib/seo-assets.ts`, proxy ke backend dengan timeout 2,5 dtk + fallback statis; cache `public, max-age=300, s-maxage=300, stale-while-revalidate=86400`).
- `pageSeo` (`lib/seo.ts`): title (+" - Indobraga" bila belum ada), description, robots (`index, follow, max-image-preview:large…` / `noindex, nofollow`), `og:site_name/title/description/type/url/image?`, `twitter:card=summary_large_image/title/description/image?`, canonical (dihilangkan bila noindex).
- Root head: charset, viewport, `author = PT. Braga Indonesia Perkasa`, default SEO, `favico.png` (icon + apple-touch-icon), Google Fonts (Inter 400–700, Plus Jakarta Sans 600–800) + preconnect, CSS app, JSON-LD `Organization` (email, telepon, Instagram) + `WebSite`.
- Sudah client-only walau SSR: `SiteSettingsProvider` fetch di effect (header/footer/nomor WA server-render memakai `fallbackSettings`, logo asli muncul setelah mount); `AdminLayout` hanya spinner "Memeriksa akses…" di server.

### Isu SEO yang ditemukan
- Root `head()` selalu emit `canonical "/"` → halaman anak kemungkinan punya **dua canonical**; `/admin`, `/login` ikut mewarisi canonical root. (Konfirmasi dengan curl ke produksi.)
- `seo_title`, `seo_description`, OG image dari `/admin/settings` **tidak dipakai** frontend (judul di-hardcode).
- Backend punya `GET /api/v1/public/seo/:route` tapi frontend tidak memanggilnya.
- Slug berita tak dikenal → error state dengan HTTP 200 (soft 404).

## 2. Data fetching

- `lib/api.ts`: native `fetch` (bukan axios). Envelope `{success,data,meta}` / `{success:false,error:{code,message,details}}`; status HTTP → kode error; `ApiClientError` (code, status, details, requestId dari `x-request-id`); pesan Indonesia.
  - `publicApiRequest`: `credentials:"omit"`, tanpa CSRF.
  - `adminApiRequest` / `authApiRequest`: `credentials:"include"`, header CSRF pada POST/PUT/PATCH/DELETE.
  - Body JSON kecuali FormData/Blob.
- Auth: cookie session httpOnly SameSite=Lax (secure di produksi). Tanpa bearer/refresh.
- CSRF double-submit: baca cookie non-httpOnly `VITE_CSRF_COOKIE_NAME` (default `indobraga_csrf`) → header `x-csrf-token`. Login `csrf:false`.
- Env: `VITE_API_BASE_URL`, `VITE_API_PREFIX` (`/api/v1`), `VITE_CSRF_COOKIE_NAME`, server-only `API_INTERNAL_BASE_URL`.
- `hooks/use-api-query.ts`: hook buatan sendiri (data/error/loading, `reload`, `setData`); key hanya dependency effect. **Tanpa cache/dedupe/retry** → `authApi.me()` di-fetch terpisah oleh `AdminLayout`, `admin.email-history`, `admin.users`.
- `lib/api-services.ts`: `authApi`, `publicContentApi`, `publicLeadApi`, `adminDashboardApi`, `adminNotificationsApi` (+ SSE `streamUrl`), `adminAudienceApi`, `adminContentApi` (generik 12 resource: list, detail, create, update, status, archive, unarchive, remove, reorder), `adminMediaApi` (upload FormData), `adminLeadApi`, `adminEmailAccountsApi`, `adminEmailCampaignApi`, `adminEmailTemplateApi`, `adminUsersApi`.
- Method client yang **tidak dipakai UI**: seluruh `adminAudienceApi` (termasuk export CSV), `createDraftFromAudience`, `previewInquiryRecipients`, `createDraftFromInquiries`, `adminContentApi.reorder`, method `detail`, `testSmtp`, `adminEmailCampaignApi.update/detail`.
- `admin.email-history.tsx` polling `setInterval` 5 dtk.

## 3. Halaman & fitur

### Publik (`_public.tsx` → `PublicLayout`: `SiteSettingsProvider`, `SiteHeader`, `<main><Outlet/>`, `SiteFooter`, `WhatsAppFAB`)

| Path | Fitur |
|---|---|
| `/` | Hero 2 gambar cross-fade (`animate-hero-slide-one/two`, 9 dtk); `animate-fade-up`; 3 stat tile; carousel logo klien 2 baris horizontal dengan tombol prev/next `scrollBy`, edge fade, grayscale→warna saat hover; grid keunggulan; 6 portofolio unggulan; mesin/kapasitas cetak/layanan; 3 berita terbaru; CTA. |
| `/portfolio` | Chip filter kategori (state lokal, tidak di URL); tampil 8 lalu cursor pagination "Muat lagi"; badge jumlah gambar; `PortfolioModal` (Radix Dialog carousel: panah, dots, keyboard ←/→, swipe 40 px, animasi zoom/fade tw-animate). |
| `/fasilitas` | Keunggulan, total kapasitas bulanan terhitung, kapasitas cetak, mesin, layanan. |
| `/galeri` | Grid (tiap tile ke-7 lebih besar); overlay play video; lightbox fixed custom (bukan Radix); reveal + cursor "Muat lagi". |
| `/berita?page=N` | Grid 6; pagination bernomor via `<Link search={{page}}>`. Juga layout induk detail (`useRouterState` pathname → `<Outlet/>`). |
| `/berita/$slug` | Artikel, link kembali mempertahankan `page`, paragraf konten. |
| `/kontak` | Info kontak dari settings; form inquiry (FormData, honeypot tersembunyi `website`, banner sukses 4 dtk, toast saat error). |
| semua publik: `WhatsAppFAB` | Modal nama + telepon → `POST /public/whatsapp-leads` → `window.open(whatsapp_url)`; fallback `wa.me/{settings.whatsapp}`; animasi ping; gambar `/whatsapp.png`. |
| `/login` | Email prefilled `admin@indobraga.com`; login → navigate `/admin`. |
| `/robots.txt`, `/sitemap.xml` | Server handler proxy backend. |

### Admin (`admin.tsx` → `AdminLayout`)

Layout: 5 grup sidebar / 16 link; drawer mobile; dropdown notifikasi (Radix) + badge unread; **SSE** `EventSource(/admin/notifications/stream, {withCredentials})` event `notification.created` & `notification.read`, fallback polling 120 dtk; mark read / mark all read; klik notifikasi → route berdasarkan `resource_type`; logout. **Input search di top bar tidak berfungsi.**

| Path | Fitur |
|---|---|
| `/admin` | Dashboard: 6 stat card (Total Pesan Kontak, Prospek WhatsApp, Berita Tayang, Portofolio Aktif, Media Siap Pakai, Email Massal Menunggu), inquiry terbaru, kampanye terbaru. |
| `/admin/hero` | 2 resource manager: `hero` & `hero-slides` (upload media, hidden `hero_section_id`). |
| `/admin/partners`, `/strength`, `/services`, `/portfolio-categories` | Resource manager tunggal. |
| `/admin/portfolio` | Select kategori dari API; `media-multi` (maks 10, urut dengan tombol panah, gambar pertama = cover); checkbox featured; field SEO. |
| `/admin/machines` | 3 manager: mesin, kapasitas cetak, kapasitas produksi. |
| `/admin/gallery` | Manager gambar/video + poster; `MediaLibraryPanel` (filter aktif/arsip/cleanup_failed; retry, arsip, unarsip, hapus; hanya 24 item pertama, tanpa pagination). |
| `/admin/news` | Field `paragraphs` (split per baris), thumbnail & OG media, field SEO. |
| `/admin/inquiries`, `/admin/whatsapp` | `LeadManager`: search, filter status, pagination server, edit status + catatan internal, arsip, aksi kirim (email → buka email-blast dengan search params; WhatsApp → `wa.me` via normalisasi nomor `lib/lead-contact.ts`). |
| `/admin/email-accounts` | Search, filter provider, pagination; Google OAuth (buka `authorization_url` tab baru); buat SMTP (default Hostinger 465 SSL/TLS), edit, reconnect, disable, hapus. |
| `/admin/email-blast?tab=single\|bulk&email&name` | `validateSearch`; tab Single & Bulk; pilih template & "simpan sebagai template"; `EmailContentEditor` (toggle text/HTML, preview HTML, chip variabel disisipkan di kursor); **import XLSX** (`read-excel-file/browser` dynamic import); **unduh template XLSX** (`write-excel-file/browser`); validasi baris, dedupe, limit (`-admin.email-blast.helpers.ts`); peringatan variabel hilang; modal preview mengisi `{{var}}`; simpan draft, konfirmasi, kirim. |
| `/admin/email-templates` | List/search/paginate, edit (editor sama), hapus. Template baru dibuat dari email-blast. |
| `/admin/email-history` | Search, filter status, pagination; **polling 5 dtk** selama ada kampanye pending/processing (skip saat tab tersembunyi); modal detail penerima + log (perlu permission `email_campaign_logs.read`); resend failed (perlu `email_campaigns.send`). |
| `/admin/settings` | Identitas/kontak, radio tampilan logo, SEO title/description, 4 upload media (logo navbar, logo footer, hero kontak, OG image). |
| `/admin/users` | Search, filter role, pagination; buat dengan password sementara; edit dengan password baru opsional; aktif/nonaktif; hapus. `content_editor` tidak bisa memberi role `super_admin`. |

### Komponen generik admin
- `AdminResourceManager`: search, tab status (Aktif/Tayang/Draf/Arsip), pagination server (`TablePagination` 10/25/50/100 + ellipsis), kartu mobile vs tabel desktop, `CrudModal` dengan tipe field text, textarea, number, select (nilai numerik opsional), checkbox, media, media-multi, paragraphs, hidden; toggle publish/draft; arsip, unarsip, hapus via `ConfirmDialog`.
- Kompresi gambar (`lib/image-compression.ts`): `createImageBitmap` → canvas → WebP q0.82, maks 1920 px; pakai file asli bila hasil tidak lebih kecil atau tipe bukan jpeg/png/webp. Dipakai `MediaUploadField` & `MediaGalleryField`.
- **Tidak ada drag-and-drop**; `reorder` tidak dipakai.
- Preview HTML email memakai `dangerouslySetInnerHTML` tanpa sanitasi (`EmailContentEditor.tsx`, `admin.email-blast.tsx`).

## 4. Guard admin
- Hanya client-side: `AdminLayout` → `useApiQuery(["auth","me"])`; loading → spinner; `UNAUTHENTICATED` → `/login`; error lain → `ErrorState` + retry.
- Penegakan sebenarnya di backend (session guard + CSRF guard).
- `/login` tidak me-redirect user yang sudah login.

## 5. Design system
- `src/styles.css`: `@import "tailwindcss" source(none); @source "../src"; @import "tw-animate-css"`; `@custom-variant dark`; `@theme inline` memetakan CSS variable → warna Tailwind: background, foreground, card, popover, primary, primary-foreground, **primary-deep**, **primary-soft**, secondary, muted, accent, destructive, **success**, **warning**, border, input, ring, chart-1…5, sidebar-*. Radius dari `--radius: 0.875rem`.
- Warna brand (oklch di `:root`): primary navy `oklch(.36 .16 258)`, deep `oklch(.22 .12 260)`, accent kuning `oklch(.86 .17 95)`. Sidebar deep navy dengan item aktif kuning.
- Token non-warna: `--gradient-hero/accent/soft`, `--shadow-elegant/card/glow`, `--transition-smooth`.
- Utility custom: `.bg-gradient-hero/accent/soft`, `.shadow-elegant/card`, `.text-balance`, `.text-anywhere`, `.animate-fade-up/fade-in/marquee/hero-slide-one/two`, `.skeleton-shimmer` + keyframes; dukungan `prefers-reduced-motion`.
- Font: Inter (body), Plus Jakarta Sans (h1–h4) dari Google Fonts.
- Dark mode: palet `.dark` ada (default shadcn slate) tetapi **tidak pernah diaktifkan**.
- Warna hardcoded tersisa: tombol hijau WhatsApp, teks warning `oklch(.45 .15 75)` (`admin/ui.tsx`, `admin.index.tsx`), `bg-emerald-600`.
- `components.json`: shadcn "new-york", base slate, ikon lucide.
- `components/ui`: alert-dialog, button (cva), dialog, dropdown-menu, scroll-area, skeleton, sonner.
- Primitive admin: `components/admin/ui.tsx` (PageTitle, Card, StatusBadge ±33 status, PrimaryButton, GhostButton, IconActionButton + tooltip CSS), `CrudModal.tsx` (CrudModal, ConfirmDialog, Field, TextInput, TextArea, Select), `Pagination.tsx`, `ApiState.tsx`.
- Lainnya: `BrandLogo`, `PublicSkeletons`, `MediaPlaceholder`/`OptionalImage`, `PageHero`.
- `public/`: `favico.png` (406×389), `whatsapp.png`, `logo-indobraga-biru.png`, `logo-indobraga-kuning.png` (1592×390; dua logo ini tidak direferensikan di `src`).

## 6. State
- Satu context: `SiteSettingsContext` (default `fallbackSettings`). Tanpa global store, tanpa localStorage.
- `<Toaster position="top-right" richColors closeButton>` (sonner) di root.

## 7. Bagian spesifik TanStack yang harus diganti
- `createFileRoute`, `createRootRoute`, `routeTree.gen.ts` (702 baris), `getRouter`.
- `HeadContent`/`Scripts`/`shellComponent`, import CSS `?url`.
- `Link`: 25 pemakaian di 7 file (7× `search={{page}}`, 1× `params={{slug}}`, `activeProps/activeOptions` di `SiteHeader`).
- `useNavigate`: 9 (termasuk `navigate({to, search})` di `admin.inquiries.tsx`).
- `useLocation` (menu aktif `AdminLayout`), `useRouterState` (`berita`), `Route.useSearch/useParams/useLoaderData`, `useRouter().invalidate` (`DefaultErrorComponent`).
- Typed search params: `/berita` (page) dan `/admin/email-blast` (tab/email/name).
- `pendingComponent` + `pendingMs/pendingMinMs: 300` di 6 route; `defaultErrorComponent`; `notFoundComponent`; `scrollRestoration`.
- Nested `/berita` → `/berita/$slug` (loader list ikut jalan di detail).
- Prefix `-` (konvensi ignore TanStack) pada helper & test di `routes/`; `EmailContentEditor` import `@/routes/-admin.email-blast.helpers`.
- Build: `@lovable.dev/vite-tanstack-config` (Tailwind, React, tsconfig-paths, alias `@`, dedupe, define `VITE_*`, dev port 8080, lovable-tagger) + `nitro`.
- `package.json` `"sideEffects": false` (hati-hati import CSS side-effect).

## 8. Test
- 28 file (16 `.tsx`, 12 `.ts`). Vitest 4, env default `node`; jsdom per file (`// @vitest-environment jsdom`, 13 file). Coverage v8 threshold 70/65/60/70 (exclude `routeTree.gen.ts`, `components/ui`).
- **Tanpa Testing Library**: `react-dom/client` `createRoot` + `act`, atau `renderToStaticMarkup`.
- 12 file mock `@tanstack/react-router` dan memanggil `Route.options.component/.head/.validateSearch` → harus ditulis ulang.
- Bisa dipindah hampir apa adanya: test lib/helper (api, api-services, seo, seo-assets, image-compression, lead-contact, date, user-facing-error, helper email-blast/settings).

## 9. `seo.ts`, `seo-assets.ts`, `public-fallbacks.ts`
- `seo.ts`: `SITE_URL=https://indobraga.com`, `SITE_NAME`, `COMPANY_NAME`, `DEFAULT_TITLE`, `DEFAULT_DESCRIPTION`; `absoluteUrl`, `withSiteName`, `pageSeo`, `structuredDataScripts`, `organizationJsonLd`, `websiteJsonLd`, `articleJsonLd`.
- `seo-assets.ts`: fetch sitemap/robots dari backend + fallback statis (6 halaman, lastmod 2026-05-12, slug berita dari `data/site.ts`; robots disallow `/admin`, `/login`, `/api/`, `/internal/`).
- `public-fallbacks.ts`: `data/site.ts` (278 baris: portofolio, mesin, kapasitas, layanan, berita, partner, keunggulan, galeri, COMPANY) → bentuk API `fallbackHome`, `fallbackFacilities`, `fallbackPortfolioList/Categories`, `fallbackGalleryList`, `fallbackNewsPage`, `fallbackNewsDetail`; gambar `null` → placeholder.

## 10. Deploy legacy
- 1 VPS Ubuntu 24.04, `/var/www/indobraga/current` (git worktree), env di `shared/apps-api.env` (+ opsional `shared/apps-web.env`).
- PM2 (`ecosystem.config.cjs`, unit systemd `pm2-dimasprasetio`): `indobraga-api` port 3001; `indobraga-web` SSR `127.0.0.1:3000` dengan `API_INTERNAL_BASE_URL=http://127.0.0.1:3001`.
- Nginx + Let's Encrypt (indobraga.com + www): `/api/` → 3001; `/` → 3000; `/robots.txt` & `/sitemap.xml` → 3001; `/api/v1/admin/notifications/stream` `proxy_buffering off`, `read_timeout 1h`; `/assets/` dari `.output/public/assets` immutable 1 tahun.
- MySQL di VPS yang sama. `ops/systemd/*`: drop-in `mysql.service` me-restart API PM2 setelah `mysqladmin ping` sukses. Backup `mysqldump` otomatis saat migration berubah.
- Media: bucket S3-compatible IDCloudHost, key `upload/{dev|prod}/{kategori}/{tanggal}/file`; frontend menerima URL absolut.
- CI/CD (`.github/workflows/quality.yml`): Node 22.12, `npm ci`, prisma generate/validate, lint, coverage test API & web, build, `security-audit`; di `main` deploy via SSH (appleboy) → `scripts/deploy-production.sh <sha>` (flock, cek tree bersih, `npm ci`, build, backup DB bila migration berubah, `prisma migrate deploy`, `pm2 startOrReload`, `nginx -t` + reload, smoke curl).

## 11. Baseline Lighthouse (`Lighthouse.json`, 2026-05-13, desktop, https://indobraga.com/)

| Kategori | Skor |
|---|---|
| Performance | 94 |
| Accessibility | 98 |
| Best Practices | 96 |
| SEO | 100 |

FCP 0,8 dtk · LCP 1,5 dtk · TBT 0 ms · CLS 0,02 · Speed Index 0,8 dtk.
