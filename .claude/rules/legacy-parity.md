# Rule: Legacy parity

Applies to: whole repository.

- The legacy app (`../indobraga/`) is the specification for everything a visitor or admin can see or
  do. Read `analysis/000-legacy-inventory/{frontend,backend}.md` and, when details are missing, the
  legacy source — never guess behavior, texts, limits, or ordering.
- Any intentional deviation must be a BC listed in `knowledge/decisions/ADR-0012-legacy-behavior-changes.md`
  with a test proving it. New BCs require Dimas' approval (amend ADR-0012 first).
- Visual baselines in `apps/web/e2e/` are never updated with `--update-snapshots`; only new states
  (e.g. Not Found, BC items) may get new snapshots, with approval.
- Improvements outside the BC list go to the backlog in `plans/README.md`, not into the code.
- Never modify the legacy repo, its `.env`, or its databases.
