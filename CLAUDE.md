# indobraga — Claude Code Gateway

Revamp company profile + dashboard admin **Indobraga** (PT. Braga Indonesia Perkasa) dari legacy
NestJS + TanStack Start (`../indobraga/`, read-only) menjadi Dimas Monorepo Standard:
backend **Go modular monolith** (`apps/api`), frontend **React 19 SPA** (`apps/web`), kontrak
OpenAPI (`packages/api-contract`), satu container Docker, MySQL di host, VPS baru.

**Syarat utama: tidak ada desain maupun kapabilitas legacy yang hilang.** Perubahan perilaku hanya
yang tercatat sebagai BC di `knowledge/decisions/ADR-0012-legacy-behavior-changes.md`.

## Perintah (dari root)

```bash
npm run dev:web          # frontend (Vite :5173, proxy /api)
npm run dev:api          # backend (Air :8080) — terpisah, jangan digabung
npm run build:web && npm run build:api
npm run test:web && npm run test:api   # DITANGGUHKAN — testing ditunda (ADR-0011)
npm run lint:web && npm run lint:api
npm run migrate:up       # golang-migrate (DB_DSN dari .env)
npm run sqlc:generate
npm run build -w @indobraga/api-contract   # bundle + lint + mapping + tipe TS kontrak
```

## Aturan arsitektur kritis

- Backend: modul hanya membuka `contracts/`; tanpa import internal modul lain, tanpa join/FK lintas
  modul; relasi lintas modul = ID primitif; wiring di `internal/app/wire.go`.
- Kontrak dulu: setiap endpoint ada di `packages/api-contract/openapi.yaml`; ubah kontrak sebelum kode.
- Envelope `{success, message, data, meta}` / error `{success:false, code, message, errors, request_id}`.
- Frontend: react-router lazy routes, Zustand, Zod, satu Axios instance, alias `@/*`, tema di
  `src/theme/`; UI legacy adalah spesifikasi visual.
- Docker: satu container app; database di host.
- Repo GitHub bersifat **public**: jangan pernah commit secret, `.env`, dump DB, atau data pribadi.

## Sebelum mengubah kode

1. Baca `knowledge/INDEX.md` lalu file `knowledge/` yang relevan, dan bagian plan yang sedang
   dikerjakan di `plans/` (status di `plans/README.md`).
2. Untuk perilaku yang terlihat user, cek baseline legacy di `analysis/000-legacy-inventory/` (dan kode
   legacy bila perlu) — jangan menebak.
3. Ikuti rule path-scoped di `.claude/rules/`.
4. Bila dua sumber bertentangan, ikuti `knowledge/SOURCE_PRIORITY.md` dan laporkan konfliknya.
5. Dokumentasi library terbaru: gunakan Context7 bila tersedia.
