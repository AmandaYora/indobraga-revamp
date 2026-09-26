# Rule: Security & personal data

Applies to: whole repository.

- The GitHub repository is PUBLIC. Never commit `.env`, secrets, API keys, OAuth tokens, database
  dumps, production screenshots of admin pages, or any personal data (names, emails, phone numbers of
  real customers). Only fictional data from the synthetic dataset may be committed.
- Production dumps and artifacts with real data stay on the server or outside the repo
  (`private-baseline/` is git-ignored) and are deleted after PLAN-05.
- Secrets come from environment variables; `.env.example` holds placeholders only; seed has no
  default credentials.
- Email account secrets are encrypted with AES-256-GCM (`v1:iv:tag:ct`); never return them in API
  responses or logs. Mask emails/phones in logs.
- Auth: httpOnly session cookie + CSRF double-submit; compare secrets/tokens in constant time.
- Uploads: validate magic bytes and size, reject > 100 MP images before full decode.
- Render untrusted HTML (email previews) only inside a sandboxed iframe.
