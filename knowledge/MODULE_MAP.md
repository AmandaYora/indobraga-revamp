# Module Map

> Each module's responsibility and the public contract it exposes.

| Module | Responsibility | Public contract | Owned tables | External integrations |
|---|---|---|---|---|
| auth | _TODO_ | _TODO_ | _TODO_ | _TODO_ |
| users | _TODO_ | _TODO_ | _TODO_ | _TODO_ |
| order | _TODO_ | _TODO_ | _TODO_ | _TODO_ |

_TODO: fill in for indobraga. "Owned tables" and "External integrations" matter as much as the
contract — they're what lets an analysis catch a cross-module join or a secondary integration
(e.g. "forgot password" implying an email send) before it's built._

"Owned tables" here is a **name-only index** for fast cross-module boundary checks —
`DATABASE.md` is the authoritative source for schema detail (fields, types, constraints). Keep
this column in sync with `DATABASE.md`; if they ever disagree, that's a conflict to report, not
a choice to make silently.
