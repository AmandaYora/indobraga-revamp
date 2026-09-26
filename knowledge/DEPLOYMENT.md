# Deployment — indobraga

## Local
```bash
npm run dev:web
npm run dev:api
```

## Docker
One app container serves the static frontend and the API on port 8080.
The database runs on the host; the container reaches it via `host.docker.internal`.

```bash
docker compose up --build
```

Set host DB env in `.env` (copy from `.env.example`).
