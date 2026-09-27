# Frontend (`apps/web`)

> Status: konvensi PLAN-01; implementasi di PLAN-02 (`plans/PLAN-02-frontend.md`).

## Stack (terkunci di `package-lock.json`)

React 19.3 · react-router-dom 7 (data mode: `createBrowserRouter`, `lazy`, `loader`,
`errorElement`, `ScrollRestoration`) · Zustand 5 · Zod 4 · Axios 1 · Tailwind CSS 4.3 · Vite 8 ·
TypeScript 6.0 (terbaru yang didukung typescript-eslint) · Vitest 5 · ESLint 10 · Playwright.
Dilarang: `@tanstack/*`, `@lovable.dev/*`, `nitro`, Redux, TanStack Query/Table.

## Struktur

Standar monorepo: `src/app` (App, providers, routes: `route-paths.ts`, `public.routes.tsx`,
`protected.routes.tsx`), `src/modules/<m>/{pages,components,services,schemas,stores,hooks,types,index.ts}`,
`src/shared/{components/ui,components/feedback,layouts,services,stores,hooks,lib,types,constants}`,
`src/theme/{colors.ts,theme.css,index.ts}`, `src/styles/globals.css`, `src/mocks/` (MSW, dev/test saja).
Daftar modul: `MODULE_MAP.md`. Pemetaan file legacy → baru: PLAN-02 §2.2.

## Aturan

- Satu instance Axios: `shared/services/http-client.ts` (unwrap envelope, `ApiError`, CSRF header,
  401 → `/login?redirect=`). Service per modul memakai tipe `@indobraga/api-contract`.
- Zod hanya di batas kepercayaan: form, search params, JSON bootstrap.
- Store: `auth`, `site-settings`, `notifications`, `ui`; state lain lokal.
- Shared UI tidak mengenal status domain (mis. `Badge` generik + peta status di tiap modul).
- Import lewat alias `@/*`; antar modul hanya lewat `index.ts` modul.
- Route publik & admin di-lazy-load; pending UI muncul hanya bila > 300 ms dan bertahan ≥ 300 ms
  (paritas `pendingMs/pendingMinMs` legacy).

## Desain (ADR-0010)

- UI legacy = spesifikasi. Token oklch (primary navy `oklch(.36 .16 258)`, deep `oklch(.22 .12 260)`,
  accent kuning `oklch(.86 .17 95)`), radius `0.875rem`, gradient/shadow/animasi custom dipindah dengan
  nilai identik ke `src/theme/theme.css` + `src/styles/globals.css`.
- Font Inter (body) & Plus Jakarta Sans (h1–h4), di-self-host (BC-28).
- Radix + pola shadcn (new-york) di `shared/components/ui`; ikon `lucide-react` versi sama dengan legacy.
- Skill `frontend-design` untuk state baru (404, empty/error) & review, bukan restyle.

## SEO client (ADR-0005)

Head awal disisipkan Go (`data-server-seo`); komponen `<Seo>` (React 19 metadata native) mengganti
tag setelah mount dan saat navigasi memakai `GET /api/v1/public/seo?path=`. Tepat satu canonical
(BC-20). `/login` & `/admin/*` noindex. Bootstrap JSON dibaca sekali lalu dihapus.

## Konvensi yang ditetapkan saat implementasi (2026-09-27)

- **UI admin bersama = port legacy 1:1**: `shared/components/ui/{card,page-title,action-buttons,
  icon-action-button,badge,pagination}.tsx`, `shared/components/feedback/states.tsx`,
  `modules/content` (`CrudModal`, `ConfirmDialog`, `Field`, input). Jangan restyle; halaman admin memakai
  komponen ini apa adanya.
- **Status → label & warna** per domain di `modules/content/lib/status-map.ts` +
  `components/StatusBadge.tsx` (label & tint legacy, fallback "Status belum dikenal"); `Badge` di
  shared hanya tahu *tone*.
- **Jalur JS publik tanpa barrel**: `PublicLayout`, route publik, dan halaman publik mengimpor
  langsung dari file komponen/service (bukan `@/modules/<m>` index yang ikut mengekspor kode admin).
  `AdminLayout` dimuat lewat `lazy()` di route `/admin`. Guard route mengimpor store auth langsung.
- **Copy & SEO halaman publik** terpusat di `modules/site/lib/page-copy.ts` (`PAGE_SEO`, subtitle
  PageHero) — nilainya dari legacy `route head()` dan `lib/seo.ts`.
- **Pending UI publik**: `modules/site/hooks/use-public-pending.ts` (tunda 300 ms, tahan ≥ 300 ms);
  skeleton per modul di `components/*Skeletons.tsx`.
- **Mock**: `public/mockServiceWorker.js` dibutuhkan `dev:mock`; plugin build membuangnya dari `dist`.
- **Font**: family terdaftar `Inter Variable` / `Plus Jakarta Sans Variable` (fontsource).
- **XLSX**: `readSheet` (read-excel-file v9) dan `writeXlsxFile(...).toFile()` (write-excel-file v4);
  jangan menimpa tipe library dengan `declare module`.
- **Bundle awal beranda**: 178,5 KB gzip (legacy ±141 KB). Selisih utama dari Axios & Zod yang
  diwajibkan standar; budget "≤ legacy" di PLAN-02 perlu diputuskan ulang oleh owner.

## Test (ADR-0011)

> Ditangguhkan (keputusan owner 2026-09-27). File `*.test.*` dikecualikan dari `tsc` dan tidak
> dijalankan di CI sampai testing diaktifkan kembali.

Vitest (unit, component, page) + Testing Library + MSW; validasi setiap request/respons mock terhadap
`openapi.yaml`; Playwright E2E + visual regression terhadap baseline legacy di `apps/web/e2e/`
(snapshot baseline via Git LFS, tidak boleh di-update); axe; coverage ≥ 80/75/80.

Baseline & dataset: `apps/web/e2e/datasets/synthetic/` (data fiktif, dipakai legacy saat capture dan
menjadi fixture mock), `apps/web/e2e/assets/`, `apps/web/src/mocks/fixtures/`.
