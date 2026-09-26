# @indobraga/api-contract

Kontrak API v1 Indobraga (OpenAPI 3.1) — **sumber kebenaran** antarmuka `apps/web` ↔ `apps/api`
(ADR-0004). Frontend (PLAN-02) dan backend (PLAN-03) sama-sama diuji terhadap file ini.

## Struktur

```txt
packages/api-contract/
├── src/
│   ├── openapi.base.yaml          # info, servers, tags, security schemes (tanpa paths)
│   ├── openapi.yaml               # GENERATED (assemble) — root berisi $ref ke fragmen
│   ├── components/
│   │   ├── schemas/envelope.yaml  # SuccessBase, PaginationMeta, CursorMeta, ErrorEnvelope, ErrorCode
│   │   ├── schemas/common.yaml    # Id, Timestamp, ContentStatus, MediaPreview, Permission, ...
│   │   ├── schemas/<modul>.yaml   # skema milik satu modul
│   │   ├── parameters.yaml        # IdPath, SlugPath, Page, Q, Cursor, RequestIdHeader
│   │   ├── responses.yaml         # respons error standar
│   │   └── headers.yaml
│   └── paths/<fragmen>.yaml       # map `<path lengkap>: <path item>` per modul/grup
├── openapi.yaml                   # GENERATED (bundle) — satu file, dipakai web & api
├── generated/schema.d.ts          # GENERATED (openapi-typescript)
├── legacy/legacy-endpoints.json   # snapshot 160 endpoint legacy (scripts/legacy-endpoints.mjs)
├── LEGACY_MAPPING.md              # GENERATED (check) — pemetaan legacy → v1
└── scripts/
```

## Perintah

| Perintah (dari root repo) | Fungsi |
|---|---|
| `npm run contract:bundle` | assemble fragmen → `src/openapi.yaml` → bundle `openapi.yaml` |
| `npm run contract:lint` | Redocly lint (0 error wajib) |
| `npm run contract:generate` | tipe TS `generated/schema.d.ts` |
| `npm run build -w @indobraga/api-contract` | bundle + lint + check mapping + generate |
| `npm run validate:fragment -w @indobraga/api-contract -- src/paths/<f>.yaml` | validasi satu fragmen (aman paralel) |
| `npm run legacy:scan -w @indobraga/api-contract` | pindai ulang controller legacy (butuh repo legacy) |

## Konvensi (ADR-0004)

- Path ditulis **lengkap** (`/api/v1/...`, atau `/robots.txt`, `/sitemap.xml`); parameter gaya `{id}`.
- Sukses: `allOf: [SuccessBase, {required: [data], properties: {data: ...}}]`.
  - List offset: tambah `meta: PaginationMeta` (required), `data` berupa array.
  - List cursor: tambah `meta: CursorMeta` (required), `data` berupa array.
- Error: `$ref` ke `components/responses.yaml` — tidak ada skema error ad-hoc.
- Nullable: `type: [string, "null"]` (OpenAPI 3.1), bukan `nullable: true`.
- Field snake_case, nilai enum lowercase. Pesan (`message`, `summary`, `description`) bahasa Indonesia.
- Request body JSON: `additionalProperties: false` (field asing ditolak, paritas `forbidNonWhitelisted`),
  `required` eksplisit, batasan (`minLength`, `maxLength`, `pattern`, `minimum`, `maximum`, `enum`,
  `format`) **persis** seperti DTO legacy.
- Parameter `limit` didefinisikan inline per operasi dengan `default` dan `maximum` yang benar.

### Ekstensi wajib per operasi (dicek Redocly & `check-mapping.mjs`)

| Ekstensi | Nilai |
|---|---|
| `x-module` | modul Go pemilik: `auth, users, audit, media, settings, profile, portfolio, gallery, news, site, leads, audience, notifications, emailaccounts, emailtemplates, campaigns, dashboard, health` |
| `x-permission` | string permission (`leads.read`, ...) atau `null` (publik / cukup sesi) |
| `x-rate-limit` | `default` (120/60 dtk per IP), `exempt`, atau `{ limit: 5, window_seconds: 60 }` |
| `x-cache-control` | nilai header persis: `no-store` · `public, max-age=60, stale-while-revalidate=300` · `public, max-age=300, stale-while-revalidate=600` |
| `x-legacy` | `{ method, path, changes }` — endpoint legacy yang digantikan (path gaya `{id}`) dan perubahan **spesifik** di luar perubahan envelope global; `null` untuk operasi baru. Bila satu endpoint legacy dipecah ke beberapa operasi (mis. route generik `/admin/{resource}/{id}/archive` → path eksplisit per resource, agar setiap modul Go mendaftarkan route-nya sendiri — BC-05), setiap pecahan memberi `split: true` |

### Security

- Publik: `security: []`.
- Admin GET: `security: [{ sessionCookie: [] }]`.
- Admin mutasi (POST/PUT/PATCH/DELETE): `security: [{ sessionCookie: [], csrfHeader: [] }]`.
- Tick worker internal: `security: [{ workerSecret: [] }]`.

### Respons yang wajib dicantumkan

- Semua operasi: `429` (kecuali `x-rate-limit: exempt`).
- Punya body/query yang divalidasi: `400` → `ValidationError`.
- Admin: `401` → `Unauthenticated`, `403` → `Forbidden` (permission & CSRF).
- Path `{id}`/`{slug}`: `404` → `NotFound`.
- Aturan bisnis: `409` → `Conflict`, `422` → `Unprocessable`, upload `413`/`415`.
- Setiap respons 2xx punya `example` yang realistis.

Fragmen contoh: [`src/paths/health.yaml`](src/paths/health.yaml).
