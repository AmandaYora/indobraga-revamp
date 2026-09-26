# Deployment & Environment

> Status: dev lokal & env final (PLAN-01); VPS baru, staging, CI/CD produksi di PLAN-04; cutover di PLAN-05.

## Toolchain dev (terverifikasi 2026-09-26, Windows 11)

| Tool | Versi | Catatan |
|---|---|---|
| Node.js | 24.x (minimal 22.12, `engines`) | CI & Docker memakai Node 22 LTS |
| npm | 11.x | workspace root |
| Go | 1.26.5 | `apps/api/go.mod` `go 1.26` |
| Air | 1.67 | watcher backend (`go install github.com/air-verse/air@latest`) |
| golang-migrate | 4.19 (tag `mysql`) | `go install -tags mysql github.com/golang-migrate/migrate/v4/cmd/migrate@latest` |
| sqlc | 1.31 | di Windows pakai binary rilis bila `go install` gagal |
| golangci-lint | 2.14 | `go install github.com/golangci/golangci-lint/v2/cmd/golangci-lint@latest` |
| govulncheck | 1.8 | `go install golang.org/x/vuln/cmd/govulncheck@latest` |
| MySQL | 8.4 (Laragon) | di host, bukan Docker |
| Docker Desktop | – | hanya untuk uji build image |
| Git LFS | 3.7 | snapshot visual |

Catatan Windows:
- Air hanya bisa menjalankan binary `.exe` → `npm run dev:api` memakai `scripts/dev-api.mjs` yang
  menambahkan override `--build.cmd/--build.bin` khusus Windows.
- `scripts/migrate.mjs` menjalankan `migrate` **tanpa shell** karena `cmd.exe` memotong DSN di `&`.
- `python3` di Windows adalah alias Store yang macet — pakai Node untuk scripting.

## Database lokal

```sql
CREATE DATABASE indobraga_revamp      CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE indobraga_revamp_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE indobraga_legacy_baseline CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; -- baseline PLAN-01 §1.7
CREATE USER 'indobraga'@'localhost' IDENTIFIED BY '<acak>';  -- juga @'127.0.0.1'
GRANT ALL PRIVILEGES ON indobraga_revamp.*, indobraga_revamp_test.*, indobraga_legacy_baseline.* TO 'indobraga'@'localhost';
```

Password hanya di `.env` lokal (ter-ignore git).

## Menjalankan

```bash
cp .env.example .env   # isi DB_*, DB_DSN, secret dev
npm install
npm run dev:api        # Air → http://localhost:8080/api/v1/health
npm run dev:web        # Vite → http://localhost:5173 (proxy /api → VITE_DEV_API_TARGET)
```

Bila port 8080 dipakai proses lain (mis. dev server legacy), jalankan `APP_PORT=8090 npm run dev:api`
dan `VITE_DEV_API_TARGET=http://localhost:8090 npm run dev:web`.

## Env (`.env.example`)

Semua variabel terdokumentasi di `.env.example`. Pemetaan dari legacy:

| Legacy | Baru | Catatan |
|---|---|---|
| `API_PORT`, `API_HOST` | `APP_PORT=8080`, `APP_HOST` | satu port app |
| `NODE_ENV` | `APP_ENV` | development / test / production |
| `DATABASE_URL`, `SHADOW_DATABASE_URL` | `DB_DSN`, `DB_TEST_DSN` (+ `DB_HOST/PORT/USER/PASSWORD/NAME`) | format Go `user:pass@tcp(host:port)/db?parseTime=true&loc=UTC&...` |
| `API_GLOBAL_PREFIX` | – | dikunci `/api/v1` |
| `SESSION_COOKIE_NAME`, `SESSION_SECRET`, `ADMIN_SESSION_TTL_DAYS`, `CSRF_COOKIE_NAME`, `CREDENTIAL_ENCRYPTION_KEY` | sama | menggantikan `JWT_*` template standar (ADR-0006) |
| `CORS_ORIGINS` | – | dihapus: satu origin |
| `PUBLIC_SITE_URL`, `PUBLIC_MEDIA_URL` | sama | |
| `UPLOAD_*`, `MEDIA_*`, `STORAGE_*`, `S3_*` | sama | `UPLOAD_VIDEO_MAX_DURATION_SECONDS`, `MEDIA_VIDEO_POSTER_MAX_WIDTH` (tak terpakai) dibuang |
| `INTERNAL_WORKER_SECRET`, `EMAIL_*`, `SMTP_TEST_TIMEOUT_MS` | sama | |
| `NOTIFICATION_*` | sama | + `NOTIFICATION_WORKER_POLL_MS` (BC-02) |
| `GOOGLE_OAUTH_*` | sama | path redirect sama dengan legacy |
| `SEED_*` | sama | tanpa default (BC-07); `SEED_SMTP_*` legacy tidak dibawa |
| `DEFAULT_MEDIA_IMPORT_GROUP` | – | khusus script legacy |
| – | `PUBLIC_DIR`, `TRUSTED_PROXIES`, `LOG_LEVEL`, `DB_TEST_DSN` | baru |
| `VITE_API_BASE_URL`, `VITE_CSRF_COOKIE_NAME` | sama | `VITE_API_BASE_URL` kosong = same-origin |
| `VITE_API_PREFIX` | – | dikunci `/api/v1` |
| – | `VITE_DEV_API_TARGET`, `VITE_API_MOCK` | baru |

## Build & Docker

```bash
npm run build:web      # apps/web/dist
npm run build:api      # dist/api (binary statis)
docker compose build   # infra/docker/Dockerfile: node:22-alpine → golang:1.26-alpine → alpine, user non-root
docker compose up -d   # port 127.0.0.1:8080, MySQL host via host.docker.internal
```

## Produksi (ringkas — rinci di PLAN-04/05)

VPS baru, satu container app di belakang Nginx (TLS, SSE, `client_max_body_size`), MySQL host, image
dari GHCR via GitHub Actions, staging + produksi sebagai dua compose project, backup harian + uji
restore bulanan (ADR-0013).

## CI

`.github/workflows/ci.yml` — web (lint, typecheck, test, build), api (vet, golangci-lint,
`go test -race`, govulncheck, `sqlc:check`), contract (build + tidak ada diff), docker build.
