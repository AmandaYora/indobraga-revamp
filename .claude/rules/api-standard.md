# Rule: API standard

Applies to: `apps/api/**`, `apps/web/src/**/services/**`, `packages/api-contract/**`.

- Version endpoints under `/api/v1` (`robots.txt`, `sitemap.xml` at root).
- Success: `{ success: true, message, data }`; paginated adds `meta: { page, limit, total, total_pages }`;
  cursor lists add `meta: { limit, next_cursor, has_more }`.
- Error: `{ success: false, code, message, errors: [{ field, message }], request_id }` (ADR-0004 —
  `code` and `request_id` extend the standard). Messages in Indonesian.
- The contract (`packages/api-contract/openapi.yaml`) is the source of truth: change the contract
  first, then code. Never add an endpoint that is not in the contract.
- Every operation carries `x-module`, `x-permission`, `x-rate-limit`, `x-cache-control`, `x-legacy`.
- No CORS middleware: same-origin (Vite proxy in dev, one container in production).
