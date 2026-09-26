# API

Sumber kebenaran: [`packages/api-contract/openapi.yaml`](../packages/api-contract/openapi.yaml)
(dirakit dari `packages/api-contract/src/paths/*.yaml`). Dokumen ini hanya merangkum konvensi —
jangan menyalin detail endpoint ke sini. Pemetaan 160 endpoint legacy → v1:
[`packages/api-contract/LEGACY_MAPPING.md`](../packages/api-contract/LEGACY_MAPPING.md).

## Konvensi (ADR-0004)

| Aspek | Aturan |
|---|---|
| Prefix | `/api/v1`; `robots.txt` & `sitemap.xml` di root |
| Sukses | `{ success: true, message, data }` |
| List offset | `data: [...]`, `meta: { page, limit, total, total_pages }`; `page` default 1, nilai invalid → default; `limit` di-clamp ke maksimum per endpoint; `total_pages = max(1, ceil(total/limit))` |
| List cursor | `data: [...]`, `meta: { limit, next_cursor, has_more }` (portofolio & galeri publik); cursor = base64url JSON `{sort_order, id}` |
| Error | `{ success: false, code, message, errors: [{ field, message }], request_id }`; pesan Indonesia |
| Request ID | `X-Request-Id` masuk dipakai bila cocok `^[A-Za-z0-9_.:-]{8,128}$`, selain itu `req_<uuid>`; selalu di header respons |
| Validasi | field asing ditolak (`VALIDATION_ERROR`), path field bertitik, label field Indonesia |
| Penamaan | snake_case, enum lowercase |
| Auth | cookie sesi; mutasi admin wajib `x-csrf-token` (ADR-0006) |
| Rate limit | default 120/60 dtk per IP; login 5/60 dtk; pesan kontak & prospek WhatsApp publik 10/60 dtk; SSE dikecualikan; header `X-RateLimit-*`, `Retry-After` |
| Cache | `no-store` untuk auth/admin/health/leads/internal; list publik `public, max-age=60, stale-while-revalidate=300`; detail publik & SEO `public, max-age=300, stale-while-revalidate=600` |

## Kode error

Inti: `BAD_REQUEST`, `VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`,
`PAYLOAD_TOO_LARGE`, `UNSUPPORTED_MEDIA_TYPE`, `UNPROCESSABLE_ENTITY`, `RATE_LIMITED`,
`INTERNAL_ERROR`, `UPSTREAM_ERROR`, `SERVICE_UNAVAILABLE`. Domain: lihat
`packages/api-contract/src/components/schemas/envelope.yaml#/ErrorCode`.

## Ekstensi kontrak per operasi

`x-module` (modul Go pemilik), `x-permission`, `x-rate-limit`, `x-cache-control`, `x-legacy`
(endpoint legacy yang digantikan). Dicek Redocly lint + `check-mapping.mjs` di CI.

## Alur kerja perubahan API

1. Ubah fragmen di `packages/api-contract/src/paths/` (+ skema di `src/components/schemas/`).
2. `npm run build -w @indobraga/api-contract` (bundle → lint → check mapping → generate tipe).
3. Sesuaikan backend (HTTP test memvalidasi respons terhadap kontrak) dan frontend (tipe hasil
   generate, mock MSW tervalidasi kontrak).
4. Satu PR berisi kontrak + kedua sisi, atau kontrak lebih dulu.

## Endpoint per modul

| Modul | Area |
|---|---|
| auth | `/auth/login`, `/auth/logout`, `/auth/me` |
| users | `/admin/users*` |
| health | `/health` |
| dashboard | `/admin/dashboard` |
| site | `/public/home`, `/public/facilities`, `/public/seo`, `/public/seo/{route}`, `/robots.txt`, `/sitemap.xml`, `/internal/revalidation/tick` |
| settings | `/public/site-settings`, `/admin/site-settings` |
| profile | `/admin/{hero,hero-slides,partners,production-strengths,machines,printing-capacities,production-capacities,services}*` |
| portfolio | `/public/portfolio*`, `/admin/{portfolio-categories,portfolios}*` |
| gallery | `/public/gallery`, `/admin/gallery-items*` |
| news | `/public/news*`, `/admin/news*` |
| media | `/admin/media*` |
| leads | `/public/inquiries`, `/public/whatsapp-leads`, `/admin/{inquiries,whatsapp-leads}*` |
| audience | `/admin/audience/*` |
| notifications | `/admin/notifications*` (termasuk SSE `/stream`), `/internal/workers/notifications/tick` |
| emailaccounts | `/admin/email-accounts*`, `/oauth/google/email/callback` |
| emailtemplates | `/admin/email-templates*` |
| campaigns | `/admin/email-campaigns*`, `/internal/workers/email-campaigns/tick` |
