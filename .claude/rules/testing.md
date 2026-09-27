# Rule: Testing

Applies to: whole repository.

> **DEFERRED (owner decision 2026-09-27):** do not write, run, or require tests (unit, component,
> contract, E2E, visual, a11y, load, coverage) in any plan until the owner re-enables testing.
> Static checks remain mandatory: typecheck, lint, format, build, contract lint/mapping, `go vet`,
> `golangci-lint`, `govulncheck`. Existing tests stay in the repo but are not run in CI.
> The rules below apply again once testing is re-enabled.

- "Done" means automated tests are green in CI plus the plan's Definition of Done — not "tried manually".
- Frontend: Vitest (unit/component/page) + Testing Library + MSW; every MSW request/response is
  validated against `openapi.yaml`; Playwright E2E + visual regression against the legacy baseline;
  axe; coverage ≥ 80% lines / 75% branches / 80% functions.
- Backend: unit tests with fake contracts; repository tests against real MySQL
  (`DB_TEST_DSN`); HTTP tests through the full router with every response validated against the
  contract; worker tests with a fake clock and fake sender; run `go test -race` in CI; coverage
  ≥ 80% total, ≥ 85% for `application`/`domain`.
- Every BC needs a test; every legacy test case is traced in `apps/api/test/LEGACY_CASES.md`.
- Time-dependent code uses an injectable clock; tests never sleep for real time.
- Tests must be deterministic: fixed data (synthetic dataset), frozen clock, local images.
