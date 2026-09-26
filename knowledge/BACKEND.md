# Backend (`apps/api`)

> Status: konvensi PLAN-01; implementasi di PLAN-03 (`plans/PLAN-03-backend.md`).

## Stack (terkunci standar)

Go 1.26 · `net/http` + `ServeMux` (pola method/wildcard) · Air (watcher) · golang-migrate · sqlc +
`database/sql` + `go-sql-driver/mysql` · tanpa GORM. Lint `golangci-lint` v2 (`apps/api/.golangci.yml`),
`govulncheck`. Build statis `CGO_ENABLED=0`.

## Struktur

```txt
apps/api/
├── cmd/server/main.go          # load env, wiring, start server
├── cmd/seed/, cmd/seed-demo/   # PLAN-03 §3.10
├── internal/
│   ├── app/wire.go             # wiring semua modul, provider, subscriber event
│   ├── config/  database/  server/  router/
│   ├── shared/                 # teknis saja: errors, response, validator, pagination, logger,
│   │                           # clock, crypto, events, scheduler, slug, crudkit, htmltext, mailmsg
│   └── modules/<m>/
│       ├── contracts/          # satu-satunya paket yang boleh diimpor modul lain
│       ├── application/        # use case
│       ├── domain/ (+events/)  # entitas & aturan
│       ├── infrastructure/     # queries/*.sql, sqlc/, repository.go, adapter eksternal
│       ├── presentation/       # handler HTTP & registrasi route modul
│       └── <m>.module.go       # konstruktor modul
├── migrations/                 # golang-migrate, per modul berurutan
├── sqlc.yaml                   # SATU blok sql: per modul
└── .air.toml, .golangci.yml
```

## Aturan

- Boundary: hanya `contracts/` yang publik. Dilarang import `application|domain|infrastructure|presentation`
  modul lain, join/FK lintas modul. Ditegakkan `internal/archtest` di CI.
- Dependensi melingkar → provider interface di contract penyedia (didaftarkan di `wire.go`) atau event.
- Transaksi hanya di dalam satu modul; alur lintas modul diorkestrasi application service lewat contract.
- `shared/` tanpa aturan bisnis.
- Error: tipe error aplikasi → envelope ADR-0004; kode domain dipertahankan (BC-04); pesan Indonesia.
- Validasi: field asing ditolak, pesan per field berlabel Indonesia.
- Waktu: selalu lewat `clock` (bisa dipalsukan di test); simpan UTC; batas hari & path media
  Asia/Jakarta.
- Log: slog JSON; tanpa PII mentah (email/telepon di-mask).
- Setiap endpoint harus ada di kontrak; HTTP test memvalidasi respons terhadap `openapi.yaml`.

## Dev

`npm run dev:api` (dari root) → `scripts/dev-api.mjs` → Air di `apps/api` (override `.exe` di
Windows). `.env` dibaca dari root repo (`../../.env`). Test: `npm run test:api`
(CI: `go test -race ./...`). Lint: `npm run lint:api`. Vuln: `npm run vuln:api`.
