# indobraga

Monorepo generated to Dimas' standard (modular-monolith backend + React 19 frontend).

## Development

Run frontend and backend separately from the project root:

```bash
npm run dev:web
npm run dev:api
```

## Structure

- `apps/web` — React 19 + Tailwind 4 frontend
- `apps/api` — go modular-monolith backend
- `packages/` — shared code and API contract
- `knowledge/` — the project's one knowledge base: brief, architecture, module map, API,
  database, deployment, and locked decisions (read before editing; start at
  `knowledge/INDEX.md`)
- `.claude/rules/` — path-scoped technical rules
- `analysis/` — per-requirement analysis artifacts (see `analysis/README.md`)
- `infra/` — Docker and nginx

## Deployment

One Docker app container serving both the static frontend and the API on port 8080.
The database runs on the host (see `knowledge/DEPLOYMENT.md`).
