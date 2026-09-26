# Indobraga

Company profile, dashboard admin, dan API Indobraga (PT. Braga Indonesia Perkasa) — revamp dari
aplikasi legacy ke **Dimas Monorepo Standard**: backend Go modular monolith, frontend React 19 SPA,
satu container Docker, MySQL di host.

```txt
apps/web              React 19 + Tailwind 4 SPA (publik + admin)
apps/api              Go modular monolith (Air, golang-migrate, sqlc)
packages/api-contract Kontrak OpenAPI v1 — sumber kebenaran antarmuka
packages/shared       Kode lintas app yang benar-benar reusable
knowledge/            Rak pengetahuan proyek (mulai dari knowledge/INDEX.md)
plans/                Rencana revamp PLAN-01..05
analysis/             Artefak analisis per requirement (000 = inventaris legacy)
infra/                Docker & Nginx
```

## Mulai

```bash
cp .env.example .env
npm install
npm run dev:api     # http://localhost:8080/api/v1/health
npm run dev:web     # http://localhost:5173
```

Prasyarat toolchain & setup database: [`knowledge/DEPLOYMENT.md`](knowledge/DEPLOYMENT.md).
Status revamp: [`plans/README.md`](plans/README.md).
