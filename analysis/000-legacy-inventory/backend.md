# Inventaris Backend Legacy (snapshot 2026-09-26)

> Snapshot read-only dari `indobraga/apps/api` (NestJS 11 + Prisma 7). Dokumen ini **tidak diedit lagi** (aturan `analysis/`).
> Sumber kebenaran perilaku tetap kode legacy — verifikasi ulang ke kode sebelum mengimplementasikan detail apa pun.

---


I read every non-spec source file under `src/`, plus `prisma/`, `main.ts`, the config and test files, and the migrations.

**The five findings most likely to trip the Go rewrite:**
1. Gmail access tokens are never refreshed.
2. The notification email worker has no in-app scheduler; it only runs when the internal tick endpoint is called.
3. The revalidation worker never calls an external URL.
4. `/admin/media/:id/archive` may be shadowed by the generic content archive route.
5. `updated_at` has no DB default, so every insert and update must set it.

Details for each are in section 9.

## 0. Runtime basics (`src/main.ts`, `src/app.module.ts`)
- **Framework:** NestJS 11 on Express.
- **Listen address:** `app.listen(API_PORT=3001, API_HOST=0.0.0.0)`, with `app.set("trust proxy", 1)` (the app sits behind Nginx) and `enableShutdownHooks()`.
- **Global prefix:** `API_GLOBAL_PREFIX` (default `api/v1`). Two paths are excluded and served at the root: `GET /robots.txt` and `GET /sitemap.xml`.
- **Versioning:** Nest versioning is not used. "v1" is just part of the prefix.
- **Hardcoded prefix:** `SessionAuthGuard` and `CsrfGuard` check the literal string `"/api/v1/admin/"` against `originalUrl`, whatever the prefix env says.
- **Body limit:** there is no body-parser config, so Express's default **100kb JSON limit** applies. This can matter for a 1000-recipient campaign draft.
- **Global providers, in registration order:**
  - `CoreModule`: ValidationPipe, HttpExceptionFilter, CacheControlInterceptor, ResponseEnvelopeInterceptor, ThrottlerGuard, and the `cookie-parser` + RequestId middleware on `*`.
  - `AuthModule`: `SessionAuthGuard`, then `CsrfGuard`.
  - Guard order is therefore throttle, then auth (401/403), then CSRF (403).

## 1. Endpoints (160 total)

### Legend and global rules
- **Default rate limit:** 120 requests per 60s per client IP (`@nestjs/throttler` v6, in-memory store). "—" in the throttle column means this default. SSE is exempt.
- **"public":** no session needed.
- **"perm:X":** requires a valid session cookie and permission X. A missing session gives 401; a missing permission gives 403.
- **Automatic auth:** any `/api/v1/admin/*` route needs a session even without a declared permission.
- **Role model:**
  - `super_admin` has every permission.
  - `content_editor` has every permission except `email_campaign_logs.read` and `activity.read`.
  - `activity.read` and `seo.manage` are defined but no route uses them. There is no audit-log read endpoint.
- **CSRF:** a double-submit check on every non-GET/HEAD/OPTIONS request to routes that are auth/permission-guarded or under `/api/v1/admin/`.
- **Cache-Control:** `no-store` on auth, admin, health, leads and internal routes. Public lists get `public, max-age=60, stale-while-revalidate=300`. Public detail and SEO get `max-age=300, swr=600`.
- **List shape:** `{items, pagination:{page,limit,total,total_pages}}`.

### auth (`src/auth`)
| Method | Path | Auth | Throttle | Request | Response |
|---|---|---|---|---|---|
| POST | /api/v1/auth/login | public, CSRF skipped | **5/60s** | `{email, password}` | `{user:{id,name,email,role,permissions[]}}` plus Set-Cookie for session and CSRF |
| POST | /api/v1/auth/logout | session + CSRF | — | – | `{status:"logged_out"}`, clears both cookies |
| GET | /api/v1/auth/me | session | — | – | `{user}` |

### health
| GET | /api/v1/health | public (no decorator) | — | – | `{status:"ok"\|"degraded", service:"indobraga-api", uptime_seconds, checks:{database:{status,latency_ms}, storage:{status,latency_ms}}}` |
|---|---|---|---|---|---|

- The DB check is `SELECT 1` with a 2s timeout. Failure returns **503**.
- The storage check is a `ping()` with a 5s timeout. Failure only marks the response "degraded".

### public-content (all public, cached)
| Method | Path | Query | Response |
|---|---|---|---|
| GET | /api/v1/public/site-settings | – | brand, legal_name, email, phone, whatsapp, instagram, contact_person, contact_role, address, show_brand_text, logo_url, footer_logo_url, contact_hero_image_url, `seo{title,description,og_image_url}` |
| GET | /api/v1/public/home | – | `hero{title,subtitle,primary_cta{label,url}\|null,slides[]}`, partners[], strengths[], featured_portfolios[≤6], `facilities_summary{machines≤3,printing_capacities≤3,production_capacities≤6,services≤10}`, latest_news[≤3] |
| GET | /api/v1/public/portfolio | category \| category_slug, limit ≤24 (default 8), cursor | `{items[{id,title,slug,category,category_slug,thumbnail_url,medium_url,alt_text,short_description,images[]}], next_cursor, has_more}` |
| GET | /api/v1/public/portfolio-categories | – | `{items[{id,name,slug,count}]}` (published categories that have published portfolios) |
| GET | /api/v1/public/facilities | – | strengths, machines, printing_capacities, production_capacities, services |
| GET | /api/v1/public/gallery | type=image\|video, limit ≤24 (default 8), cursor | `{items[{id,type,thumbnail_url,media_url,caption,alt_text,published_at}], next_cursor, has_more}` |
| GET | /api/v1/public/news | page, limit ≤24 (default 6), category | paged list `[{id,title,slug,category,thumbnail_url,excerpt,published_at}]` |
| GET | /api/v1/public/news/:slug | slug `^[a-z0-9]+(-[a-z0-9]+)*$` | `{id,title,slug,category,thumbnail_url,excerpt,content:string[],seo{title,description,canonical_url,og_image_url},published_at}` |

- Cursors are base64url JSON `{sort_order, id}`. Pages are keyset-ordered by `(sort_order, id)` and fetched with `take limit+1`.

### seo-assets (class-level public)
| Method | Path | Auth | Response |
|---|---|---|---|
| GET | /robots.txt | public | text/plain. Disallows /admin, /login, /api/, /internal/ and lists the sitemap |
| GET | /sitemap.xml | public | application/xml. Six static pages plus `/berita/<slug>` for each published news item, with lastmod = updatedAt |
| GET | /api/v1/public/seo/:route | public | route is one of home, portfolio, fasilitas, galeri, berita, kontak, or `berita:<slug>`. Returns `{title,description,canonical_url,og_image_url,noindex:false}` |
| POST | /api/v1/internal/revalidation/tick | header `x-internal-worker-secret` | `{processed, cache_keys[]}` |

### leads
| Method | Path | Auth | Throttle | Request | Response |
|---|---|---|---|---|---|
| POST | /api/v1/public/inquiries | public, no CSRF | **10/60s** | `{name 2–120, email, phone ^[0-9+()\-\s]{7,30}$, company?, message 10–5000, website?}` | `{id, status}` |
| POST | /api/v1/public/whatsapp-leads | public | **10/60s** | `{name, phone, message? ≤700}` | `{id, status, whatsapp_url, generated_message}` |
| GET | /api/v1/admin/inquiries | perm:leads.read | — | page, limit ≤100, q, status | paged inquiries |
| GET | /api/v1/admin/inquiries/:id | leads.read | — | – | inquiry (404 if archived) |
| PATCH | /api/v1/admin/inquiries/:id | leads.manage | — | `{status?, internal_note? ≤5000}` | inquiry |
| DELETE | /api/v1/admin/inquiries/:id | leads.manage | — | – | `{id, status:"archived"}` (soft archive) |
| GET | /api/v1/admin/whatsapp-leads | leads.read | — | same query as inquiries | paged leads |
| GET | /api/v1/admin/whatsapp-leads/:id | leads.read | — | – | lead |
| PATCH | /api/v1/admin/whatsapp-leads/:id | leads.manage | — | `{status?, internal_note?}` | lead |
| DELETE | /api/v1/admin/whatsapp-leads/:id | leads.manage | — | – | `{id, status:"archived"}` |

- **Inquiry honeypot:** a non-empty `website` field returns `{id:0,status:"new"}` and nothing is stored.
- **Inquiry side effects:** stores `source` = Referer (or "website") and `meta` = `{user_agent, referrer, ip_hash: sha256(ip)}`; upserts the audience contact; creates a notification.
- **WhatsApp URL:** built from `site_settings.whatsapp` as `https://wa.me/<num>?text=<encoded>`.
- **Status values:** new, contacted, in_progress, closed, spam.
- **Inquiry response fields:** id, name, email, phone, company, message, status, internal_note, notification_status, source, created_at, updated_at.
- **WhatsApp lead response fields:** id, name, phone, generated_message, whatsapp_url, status, internal_note, source, timestamps.

### admin-content (class: perm:content.manage, no-store) — 86 endpoints
Route kinds (`R` = resource path segment):

| Kind | Method + path | Request | Response |
|---|---|---|---|
| list | GET /api/v1/admin/R | page, limit ≤100 (default 10), q, status (draft\|published\|inactive\|archived), category, segment, type (image\|video) | paged list. Archived rows are excluded unless `status` is given |
| detail | GET /api/v1/admin/R/:id | – | item |
| create | POST /api/v1/admin/R | AdminContentDto (one union DTO, snake_case, see below) | item |
| update | PATCH /api/v1/admin/R/:id | AdminContentDto (partial) | item |
| status | PATCH /api/v1/admin/R/:id/status | `{status: draft\|published\|inactive}` | item |
| delete | DELETE /api/v1/admin/R/:id | – | `{id, status:"permanently_deleted", cleanup_failed_media_count}` |
| reorder | PATCH /api/v1/admin/R/reorder | `{items:[{id, sort_order}] min 1}` (one transaction) | `{status:"updated", count}` |
| site-settings | GET and PATCH /api/v1/admin/site-settings | **perm:site_settings.manage** (overrides the class perm). PATCH body: brand, legal_name, email, phone, whatsapp, instagram, contact_person, contact_role, address, seo_title, seo_description, show_brand_text, logo_media_file_id, footer_logo_media_file_id, og_media_file_id, contact_hero_media_file_id | settings, including logo_url, footer_logo_url, og_image_url, contact_hero_image_url |
| archive | PATCH /api/v1/admin/:resource/:id/archive | resource must be one of the 12 names (else 400); id via ParseIntPipe | item. Fails with 400 if already archived |
| unarchive | PATCH /api/v1/admin/:resource/:id/unarchive | same | item, restored to `previous_status` or DRAFT |

Resource matrix. Every resource has list/detail/create/update/status/delete; reorder is noted per row.

| R (table) | Create requires | Writable fields | Search q / filters | Order | Reorder |
|---|---|---|---|---|---|
| hero (hero_sections) | title | title, subtitle, cta_label, cta_href, status | q: title, subtitle | id desc. Detail includes `slides[]` | no |
| hero-slides (hero_slides) | title | hero_section_id (0 or absent means the first hero by id; 422 if none), label, title, metric, alt_text, media_file_id, sort_order, status | q: title, label | sort, id | yes |
| partners | name | name, segment, logo_media_id, sort_order, status | q: name; segment exact | sort, id | yes |
| production-strengths | label, value | label, value, suffix, sort_order, status | q: label | sort, id | yes |
| portfolio-categories | name | name, slug (auto), sort_order, status (**defaults to PUBLISHED**) | q: name, slug | sort, id | yes. Delete returns 409 if any portfolio uses the category |
| portfolios (+portfolio_images) | title, category_id (category must be PUBLISHED) | title, slug, category_id, short_description\|description, media_file_ids[≤10] or media_file_id (first = cover `image_media_id`; the gallery is replaced atomically **only if sent**), is_featured, sort_order, status, published_at, seo_title, seo_description | q: title, category, categoryRef.name, description; `category` matches text, ref name or ref slug | sort, id | yes. Publishing needs ≥1 image and a published category (422) |
| machines | name | name, slug, metric, description, media_file_id, sort_order, status | q: name, description | sort, id | yes |
| printing-capacities | label, value, unit | + description, media_file_id, sort_order, status | q: label, description | sort, id | yes |
| production-capacities | product, value, unit | product, value, unit, sort_order, status | q: product | sort, id | yes |
| services | name | name, sort_order, status | q: name | sort, id | yes |
| gallery-items | media_file_id, media_type, caption | + poster_media_id, sort_order, status, published_at | q: caption; type | sort, id | yes |
| news | title, category, excerpt | slug, content (string[] stored as JSON), thumbnail_media_file_id, og_image_media_file_id, status, published_at, seo_* | q: title, slug, excerpt; category | published_at desc, id desc | no. Publishing needs non-empty content (422) |

Behaviour that applies to all admin-content resources:
- **Response fields:** every item returns `status`, `previous_status`, `archived_at`, `created_at`, `updated_at`. Media references are embedded as a preview object: `{id, media_type, mime_type, original_file_name, compression_status, file_url, thumbnail_url, medium_url, large_url, poster_url, video_url, width, height, duration_seconds, created_at, updated_at}`. The URLs are null unless the media is COMPLETED.
- **Media validation:** any referenced media id must be COMPLETED, otherwise the API returns **400 with code UNPROCESSABLE_ENTITY**.
- **Missing required field:** 400 VALIDATION_ERROR, message "Lengkapi bagian wajib: …".
- **Unique violation (P2002):** 409 CONFLICT.
- **Record not found (P2025):** 404.
- **Default status:** create uses DRAFT unless `status` is given (portfolio-categories use PUBLISHED).
- **Slug:** slugified from title/name when not given (lowercase, non-alphanumerics become `-`, trimmed). Fallback is `konten-<ms>`.
- **published_at:**
  - An explicit date is clamped to now if it is in the future.
  - Otherwise it is set to now when status becomes published.
  - The status endpoint writes `publishedAt = now` only for portfolios, gallery-items and news.
- **Status-endpoint publish check:** publishing a portfolio this way requires `image_media_id` and a published category.
- **After every mutation:** an audit row (`<R>.<create|update|status|archive|unarchive|reorder|permanent_delete>`) and revalidation events for these cache keys:
  - site-settings: `public:home`, `public:site-settings`, `seo:site`, `sitemap`
  - hero, hero-slides, partners: `public:home`
  - strengths, machines, printing-capacities, production-capacities, services: `public:home`, `public:facilities`
  - portfolios and categories: `public:home`, `public:portfolio:list`, `public:portfolio:categories`, `sitemap`
  - gallery: `public:gallery:list`, `public:home`
  - news: `public:home`, `public:news:list`, `sitemap`
- **Delete:** permanently removes the row, then calls `MediaService.permanentlyDeleteIfUnused` for each linked media (for a hero, that means every slide's media).

### audience
| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | /api/v1/admin/audience/contacts | audience.read | page, limit (clamped to 100), q ≤120, source (inquiry\|whatsapp_lead\|manual_import\|manual), status (active\|unsubscribed\|blocked) | paged `{id,name,email,phone,company,source,source_ref_id,status,consent_status,last_interaction_at,created_at,updated_at}` |
| GET | /api/v1/admin/audience/preview | audience.read | q, source, status | `{total_contacts, eligible_recipients, excluded_unsubscribed, excluded_blocked, sample_recipients[5]}` |
| GET | /api/v1/admin/audience/export.csv | audience.export, raw response | q, source, status | CSV file (details below) |

CSV export details:
- `text/csv; charset=utf-8`, `attachment; filename="indobraga-audience.csv"`.
- UTF-8 BOM, CRLF line endings, every cell quoted.
- Columns: Nama, Email, Telepon, Perusahaan, Sumber, Status, Consent, Interaksi Terakhir, Dibuat.
- Capped at 10,000 rows.

### dashboard
| GET | /api/v1/admin/dashboard | dashboard.read | – | `{totals, latest_inquiries[5], latest_whatsapp_leads[5], latest_email_campaigns[5]}` |
|---|---|---|---|---|

`totals` contains: inquiries, whatsapp_leads, published_gallery, published_news, active_portfolios, completed_media, failed_media, connected_email_accounts, email_campaigns, pending_email_campaigns, pending_revalidation.

### email-accounts
| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | /api/v1/admin/email-accounts | email_accounts.read | page, limit, q, provider (google\|smtp), status (connected\|invalid\|disabled\|needs_reconnect) | paged `{id,provider,auth_type,email_address,display_name,status,smtp_host,smtp_port,smtp_security,smtp_username,last_validated_at,connected_at,last_error,created_at,updated_at}`. Secrets are never returned |
| POST | /api/v1/admin/email-accounts/google/oauth-url | email_accounts.manage | `{email_hint?, display_name?}` | `{authorization_url, state_expires_at}` |
| GET | /api/v1/oauth/google/email/callback | public | code?, state (required), error? | 302 to `${PUBLIC_SITE_URL}/admin/email-accounts?connected=google&status=success\|error&reason=oauth_denied\|missing_code\|invalid_state\|provider_failed` |
| POST | /api/v1/admin/email-accounts/smtp/test | manage | SmtpAccountDto: `{email_address, display_name, smtp_host, smtp_port 1–65535, smtp_security ssl_tls\|starttls\|none, smtp_username, smtp_password ≤1000}` | `{valid, message}` |
| POST | /api/v1/admin/email-accounts/smtp | manage | SmtpAccountDto | account. Verifies first (422 on failure), then upserts on (provider, email) |
| PATCH | /api/v1/admin/email-accounts/:id | manage | UpdateEmailAccountDto: all SMTP fields optional plus status | account. For Google accounts only display_name/status may change (400 otherwise). Any SMTP field change triggers re-verify and sets CONNECTED |
| POST | /api/v1/admin/email-accounts/:id/reconnect | manage | – | Google: a new oauth-url payload. SMTP: re-verifies stored credentials and returns `{provider:"smtp", valid, account, message}` (NEEDS_RECONNECT on failure) |
| POST | /api/v1/admin/email-accounts/:id/disable | manage | – | account (DISABLED) |
| DELETE | /api/v1/admin/email-accounts/:id | manage | – | `{id,status:"deleted"}`. Returns 422 if any campaign references the account |

### email-campaigns
| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | /api/v1/admin/email-campaigns | email_campaigns.read | page, limit, q, status (draft\|pending\|processing\|completed\|failed\|cancelled), email_account_id | paged campaign (fields below) |
| GET | /api/v1/admin/email-campaigns/recipient-sources/inquiries/preview | email_campaigns.manage | q ≤120, status (lead status), date_from, date_to (date only, Asia/Jakarta +07:00 day boundaries) | `{total_inquiries, eligible_recipients, duplicate_emails, invalid_emails, recipient_limit, over_limit, sample_recipients[5]}` |
| GET | /api/v1/admin/email-campaigns/:id | read | – | campaign |
| POST | /api/v1/admin/email-campaigns/draft | manage | `{title ≤190, email_account_id, subject ≤255, body_text?, body_html?, recipients[1..1000]{name?, email, variables?:object}}` | `{id, status, total_recipients}` |
| POST | …/draft/from-inquiries | manage | same header fields + `inquiry_filter{q,status,date_from,date_to}` | same |
| POST | …/draft/from-audience | manage | same header fields + `audience_filter{q,source,status}` | same |
| PATCH | …/:id | manage | partial fields + recipients (replaces all). Drafts only (422 otherwise) | campaign |
| POST | …/:id/send | **email_campaigns.send** | – | campaign (PENDING, all recipients reset to QUEUED) |
| POST | …/:id/resend-failed | email_campaigns.send | – | campaign (only FAILED recipients re-queued) |
| GET | …/:id/recipients | read | page, limit, q, status (queued\|sending\|sent\|failed\|skipped) | paged `{id,campaign_id,email,name,status,attempts,next_attempt_at,sent_at,failed_at,error_code,error_message,created_at,updated_at}` |
| GET | …/:id/logs | **email_campaign_logs.read** (super_admin only) | page, limit, status (free text) | paged `{id,campaign_id,recipient_id,recipient_email,provider,status,message_id,error_code,error_message,response_meta,created_at}` |
| POST | /api/v1/internal/workers/email-campaigns/tick | public + header secret | – | `{claimed_campaign_id, processed, sent, failed, remaining, status}` |

- **Campaign fields:** id, title, subject, body_text, body_html, status, total_recipients, queued_count, sent_count, failed_count, started_at, finished_at, last_error, `sender_account{id,provider,email_address,display_name,status}`, created_at, updated_at.
- **Status mapping:** Prisma `SENDING` is exposed in the API as `"processing"`.
- **Sender account:** must be CONNECTED (422 otherwise).

### email-templates
| GET | /api/v1/admin/email-templates | email_campaigns.read | page, limit (default 50, max 100), q | paged `{id,name,subject,content_mode:"text"\|"html",body_text,body_html,created_at,updated_at}` |
|---|---|---|---|---|
| POST | /api/v1/admin/email-templates | email_campaigns.manage | `{name ≤190, subject ≤255, content_mode, body_text?, body_html?}` | template |
| PATCH | /api/v1/admin/email-templates/:id | manage | partial | template |
| DELETE | /api/v1/admin/email-templates/:id | manage | – | `{id, status:"deleted"}` (hard delete) |

- Body rules: HTML mode needs body_html, text mode needs body_text (422 otherwise).
- Templates are stored only. They are not linked to campaigns and not rendered server-side.

### media (class: perm:media.manage)
| POST | /api/v1/admin/media | multipart field `file` (multer in memory, hard limit 100MB) + `usage` (hero\|partner\|portfolio\|machine\|gallery\|news\|og\|other), alt_text?, caption? | media |
|---|---|---|---|
| GET | /api/v1/admin/media | page, limit (default 16), q (filename/mime), media_type (image\|video\|document), compression_status, usage (JSON path `variants->$.usage`) | paged media. Archived, pending_delete, deleted and cleanup_failed are hidden by default |
| GET | /api/v1/admin/media/:id | – | media |
| DELETE | /api/v1/admin/media/:id | – | `{id,status:"permanently_deleted"}`. 409 if referenced; 409 if storage cleanup fails |
| PATCH | /api/v1/admin/media/:id/archive | – | media. 409 if referenced |
| PATCH | /api/v1/admin/media/:id/unarchive | – | media, restored to previousStatus or COMPLETED |
| POST | /api/v1/admin/media/:id/retry | – | media. Only allowed if FAILED, and it only rewrites the error message (the original file is not kept) |

Media response fields: id, media_type, mime_type, original_file_name, compression_status, file_url, thumbnail_url, medium_url, large_url, poster_url, video_url, width, height, duration_seconds, original_size, optimized_size, error, archived_at, deleted_at, created_at, updated_at.

### notifications
| GET | /api/v1/admin/notifications | notifications.read | page, limit ≤50 (default 10), read=all\|unread, q | paged `{id,type(lowercase),severity,title,message,resource_type,resource_id,read,created_at}` |
|---|---|---|---|---|
| GET | /api/v1/admin/notifications/unread-count | notifications.read | – | `{unread_count}` |
| GET (SSE) | /api/v1/admin/notifications/stream | notifications.read; **not throttled**; raw response | – | `text/event-stream` (format below) |
| POST | /api/v1/admin/notifications/:id/read | notifications.read (+CSRF) | – | `{unread_count}` |
| POST | /api/v1/admin/notifications/read-all | notifications.read | – | `{marked_read, unread_count:0}` (at most 500 marked) |
| POST | /api/v1/internal/workers/notifications/tick | public + header secret | – | `{processed, sent, failed, retried}` |

SSE stream format:
- Each message is written as `event:<type>\nid:<n>\ndata:<json>\n\n`. Nest auto-increments `id` per connection, starting at 1.
- Event types:
  - `connected` (sent on connect)
  - `heartbeat` (every `NOTIFICATION_STREAM_HEARTBEAT_MS`, default 30s)
  - `notification.created` (**broadcast to all connected admins**, payload `{notification_id, resource_type, resource_id}`)
  - `notification.read` (sent only to that user's connections)
- Every `data` payload includes `timestamp`.
- Headers include `X-Accel-Buffering: no`.
- The subscriber registry is an in-memory map, so this only works on a single instance.

### users (class: perm:users.manage)
| GET | /api/v1/admin/users | page, limit, search, role, status | paged SafeUser `{id,name,email,role,status,permissions,last_login_at,created_at,updated_at}` |
|---|---|---|---|
| GET | /api/v1/admin/users/:id | – | user |
| POST | /api/v1/admin/users | `{name, email (lowercased), role, temporary_password ≥8}` | user. bcrypt cost 12; 409 on duplicate email |
| PATCH | /api/v1/admin/users/:id | `{name?, role?, new_password? ≥8}` | user |
| PATCH | /api/v1/admin/users/:id/status | `{status: active\|inactive}` | user |
| DELETE | /api/v1/admin/users/:id | – | `{id,status:"disabled"}` (soft disable, sessions revoked) |

User-management rules:
- `content_editor` users cannot see super admins (they get 404), cannot assign the super_admin role (403), and super admins are filtered out of their lists.
- No one can deactivate their own account or demote themselves (403).
- The last active super admin cannot be deactivated or demoted (403).
- Changing another user's password revokes all their sessions. Deactivating a user also revokes their sessions.
- **The users module writes no audit rows.**

## 2. Tables per module and cross-module coupling
| Module | Reads/writes (own) | Cross-module (flagged) |
|---|---|---|
| auth | admin_sessions (create, revoke); users (read, `last_login_at`) | AuditService. users is also written by the users module |
| users | users | **writes admin_sessions** (revokes); imports `ROLE_PERMISSIONS` from auth |
| audit | audit_logs (insert only) | Used by auth, admin-content, media, leads, email-accounts, email-campaigns, email-templates. Its `ipHash` and `userAgent` columns are never filled |
| admin-content | site_settings, hero_sections, hero_slides, partners, production_strengths, portfolio_categories, portfolios, portfolio_images, machines, printing_capacities, production_capacities, services, gallery_items, news | **reads media_files directly** (COMPLETED check, includes); imports **MediaService** (`permanentlyDeleteIfUnused`), media presenter and status maps, **RevalidationService**, Audit |
| media | media_files | **reads site_settings, hero_slides, partners, portfolios, portfolio_images, machines, printing_capacities, gallery_items, news** (reference counts); RevalidationService; Audit |
| public-content | read-only on every content table + media_files | Uses the media presenter |
| seo-assets | reads news, site_settings, media_files | Controller calls `RevalidationService.processPending` |
| revalidation | revalidation_events | Used by admin-content, media, seo-assets |
| leads | inquiries, whatsapp_leads | **reads site_settings** (WhatsApp number); calls **AudienceService.upsertFromInquiry** (writes marketing_contacts) and **NotificationsService**; Audit |
| audience | marketing_contacts | Called by leads and email-campaigns |
| notifications | notifications, notification_reads, notification_email_jobs | **reads email_accounts, site_settings; writes `inquiries.notification_status`**; uses SecretCryptoService from email-accounts |
| email-accounts | email_accounts, email_oauth_states | **reads email_campaigns count**; exports SecretCryptoService |
| email-campaigns | email_campaigns, email_campaign_recipients, email_send_logs | **reads inquiries; writes `email_accounts.status/last_error`** (sets NEEDS_RECONNECT); uses AudienceService, SecretCryptoService, email-account and lead status maps; Audit |
| email-templates | email_templates | Audit |
| dashboard | – | **reads inquiries, whatsapp_leads, gallery_items, news, portfolios, media_files, email_accounts, email_campaigns, revalidation_events**; imports campaign and lead maps |
| health | raw `SELECT 1` | Uses the `MEDIA_STORAGE` provider from media |

## 3. External integrations
- **S3** (`@aws-sdk/client-s3`, `src/media/s3-storage.service.ts`):
  - Client: custom endpoint (IDCloudHost `https://is3.cloudhost.id`), `S3_REGION` (default "auto"), `forcePathStyle` from `S3_FORCE_PATH_STYLE`.
  - Operations used: **PutObject** (`ACL: public-read`, `CacheControl: public, max-age=31536000, immutable`, ContentType, ContentLength), **DeleteObject**, and **HeadBucket** (health ping).
  - Not used: presigned URLs, GetObject, multipart upload. Every upload is proxied through the API.
  - Public URL = `PUBLIC_MEDIA_URL + "/" + URI-encoded key segments`.
  - The local driver writes to `cwd/STORAGE_LOCAL_ROOT/key`, but the API does **not** serve those files.
- **Object keys:** `${MEDIA_OBJECT_PREFIX}/${MEDIA_STORAGE_ENV ?? (prod|dev)}/${category}/${YYYY-MM-DD in MEDIA_PATH_TIME_ZONE}/${uuid}-{thumbnail|medium|large}.webp` for images, or `…-video.mp4` for video.
  - Category map: gallery→galeri, hero→hero, machine→mesin, news→berita, og→seo, other→lainnya, partner→partner, portfolio→portofolio.
- **Image processing** (sharp):
  - `metadata()` is taken on `sharp(buf,{failOn:"warning",limitInputPixels:1e8}).rotate()`. Stored width/height are the input dimensions, so EXIF orientation is not applied to them.
  - Three variants: `sharp(buf,{limitInputPixels}).rotate().resize({width, withoutEnlargement:true}).webp({quality:82})` at widths 480, 960 and 1600 (from env). They are uploaded in parallel; if any fails, the ones already stored are deleted.
  - The **original file is not stored**. `object_key` and `public_url` point to the large variant.
  - `variants` JSON = `{usage, alt_text, caption, thumbnail|medium|large:{objectKey,publicUrl,bytes}}`.
  - `size_final_bytes` = sum of the three variant sizes.
- **Video:** stored as-is. No transcoding, poster or duration; `UPLOAD_VIDEO_MAX_DURATION_SECONDS` and `MEDIA_VIDEO_POSTER_MAX_WIDTH` are unused.
- **File-type sniffing:** the **`file-type` package is a dependency but is never imported**. `src/media/media-sniff.ts` checks magic bytes instead:
  - RIFF…WEBP → image/webp
  - PNG signature → image/png
  - FFD8FF → image/jpeg
  - bytes 4–8 = `ftyp` → treated as video/mp4
  - Anything else → 415.
  - Size limits: images `UPLOAD_IMAGE_MAX_MB` (10), video `UPLOAD_VIDEO_MAX_MB` (100). Over the limit → 413.
  - `MediaKind.DOCUMENT` is never produced.
- **SMTP** (nodemailer 8):
  - Transport: `createTransport({host, port, secure: security==="ssl_tls", requireTLS: security==="starttls", auth{user,pass}, connection/greeting/socket timeout = SMTP_TEST_TIMEOUT_MS})`.
  - Tests use `verify()`; sends use `sendMail({from:"\"Name\" <email>", to, subject, html, text})`.
  - `security=none` is rejected in production.
  - The campaign sender strips CR/LF from header values; the notification sender does not.
- **Mock mode:** `EMAIL_PROVIDER_MODE=mock` fakes Google token exchange, SMTP verify (fails if host/user/password contains "fail") and campaign sends ("tempfail" gives a temporary failure, "fail" a permanent one). **Notification emails ignore mock mode and always use real SMTP.**
- **Google OAuth (Gmail send):**
  - Auth URL: `https://accounts.google.com/o/oauth2/v2/auth` with scope `openid email https://www.googleapis.com/auth/gmail.send`, `access_type=offline`, `prompt=consent`, `login_hint`.
  - `state` = `base64url(JSON{nonce,admin_user_id,exp}) + "." + base64url(HMAC-SHA256(SESSION_SECRET))`. It is also stored as a sha256 hex hash in `email_oauth_states`, valid for 10 minutes and single-use (`consumed_at`). The callback checks the signature, exp, that the stored row exists, is not consumed and not expired, and that admin_user_id matches.
  - Token exchange: `POST https://oauth2.googleapis.com/token`. Profile: `GET https://www.googleapis.com/oauth2/v3/userinfo`.
  - Access and refresh tokens are stored encrypted.
  - Sending: `POST https://gmail.googleapis.com/gmail/v1/users/me/messages/send` with a hand-built RFC822 message (text/html only; bodyText is dropped).
  - **The access token is never refreshed** (`refresh_token` is stored but unused). After about an hour Gmail returns 401, and the account becomes NEEDS_RECONNECT.
  - **Microsoft OAuth does not exist.**
- **Secret encryption** (`src/email-accounts/secret-crypto.service.ts`, same logic in seed.ts):
  - AES-256-GCM, key = SHA-256(`CREDENTIAL_ENCRYPTION_KEY`), 12-byte IV.
  - Stored format: `v1:<iv b64url>:<tag b64url>:<ciphertext b64url>`.
  - Go must be byte-compatible to read existing rows.
- **bcrypt:** `bcryptjs`, cost 12 for creates and updates; `compare` on login.
- **Sessions (no JWT):**
  - Session token = 32 random bytes as base64url.
  - Stored in the DB as `HMAC-SHA256(SESSION_SECRET)` hex in `admin_sessions.token_hash`, together with user_agent (≤500 chars), ip_hash (sha256 of the IP) and `expires_at = now + ADMIN_SESSION_TTL_DAYS` (default 7).
  - Session cookie (`SESSION_COOKIE_NAME`): httpOnly, `secure` only in production, SameSite=Lax, path `/`, maxAge = TTL.
  - Every request with the cookie triggers a DB lookup. A session is invalid if revoked, expired, or the user is INACTIVE.
  - **No refresh or sliding expiry**, and **no cleanup of expired sessions**.
  - Logout sets `revoked_at`. Login writes an audit row (`auth.login` / `auth.logout`).
- **CSRF:** a separate non-httpOnly cookie (`CSRF_COOKIE_NAME`, 32 random bytes) is set at login. Protected mutations must echo it in the `x-csrf-token` header (plain string comparison).
- **Helmet:** `helmet()` with v8 defaults (CSP defaults, HSTS 1 year with includeSubDomains, X-Frame-Options SAMEORIGIN, `Cross-Origin-Resource-Policy: same-origin`, COOP, Referrer-Policy no-referrer, nosniff, X-Powered-By removed).
- **CORS:** origins = `CORS_ORIGINS` comma-split; `credentials:true`; methods GET, HEAD, POST, PATCH, DELETE, OPTIONS (no PUT); allowed headers `content-type`, `x-csrf-token`, `x-internal-worker-secret` (not `x-request-id`); no exposed headers.

## 4. Background and async work
- **Email campaign worker** (`email-campaigns.worker.ts` + service):
  - **Triggers:**
    - An in-process `setInterval(EMAIL_WORKER_POLL_MS=60000)` safety-net poll (`unref`'d). Setting it to 0 disables both the poll and auto-drain.
    - Event-driven: `send` and `resend-failed` immediately fire `drainPendingCampaigns()` (fire-and-forget).
    - Manual: the internal tick endpoint.
  - **Concurrency:**
    - Within the process: a single-flight flag, plus a "requested again" re-arm flag.
    - Across processes: an optimistic DB claim via conditional `updateMany` (PENDING→SENDING with lockedAt, or SENDING with lockedAt null → set lockedAt). Only campaigns whose sender account is CONNECTED are claimed.
  - **Batching:** each tick processes up to `EMAIL_WORKER_BATCH_SIZE` (50) QUEUED recipients whose `next_attempt_at` is null or past. Drain keeps looping until a tick makes no progress.
  - **Sending:** sequential, **with no throttling or delay between sends**. Each attempt sets the recipient to SENDING with lockedAt and increments attempts, then writes an `email_send_logs` row.
  - **Retries:**
    - `temporary_failed` with attempt < `EMAIL_WORKER_MAX_ATTEMPTS` (3) → re-queued with `next_attempt_at = now + 60s` (fixed delay).
    - Otherwise → FAILED.
    - Gmail 5xx counts as temporary, other 4xx as permanent. Any SMTP exception counts as temporary.
  - **Account-level failure** (SMTP codes EAUTH, ECONNECTION, ETIMEDOUT, ESOCKET, EDNS, ECONNREFUSED, EHOSTUNREACH; Gmail 401/403; missing config or token):
    - The recipient is reverted to QUEUED without using up an attempt.
    - The account is set NEEDS_RECONNECT, the campaign's `last_error` is set, and the batch stops.
    - The campaign stays SENDING (paused) and resumes on its own once the account is reconnected.
  - **Crash recovery:** before each drain, recipients stuck in SENDING and campaign locks older than `EMAIL_WORKER_STALE_MS` (300000) are released.
  - **Aggregates:** recounted after every batch. A campaign becomes COMPLETED when no recipients are queued or sending, even if some failed.
  - **Fatal error:** the campaign becomes FAILED.
  - **Not implemented:** no cancel endpoint (the CANCELLED status is unused) and no campaign delete.
- **Notification generation:** only `INQUIRY_CREATED` (plus an email job when `NOTIFICATION_EMAIL_ENABLED`) and `WHATSAPP_LEAD_CREATED`, both created synchronously in the leads flow. Failures are logged and swallowed. The other types (EMAIL_CAMPAIGN_COMPLETED/FAILED, MEDIA_FAILED, SMTP_INVALID, SYSTEM_WARNING) are **never emitted**.
- **Notification email worker:**
  - **No in-app scheduler.** It runs only through `POST /internal/workers/notifications/tick`; the docs suggest cron every minute.
  - Each tick claims up to `NOTIFICATION_WORKER_BATCH_SIZE` (20) jobs, PENDING→PROCESSING, one at a time.
  - Sender: the SMTP account matching `NOTIFICATION_EMAIL_SENDER`, or else the most recently connected SMTP account.
  - Recipient: `NOTIFICATION_EMAIL_TO`, or else `site_settings.email`.
  - Retries: linear backoff of `attempt × 60s` up to `NOTIFICATION_WORKER_MAX_ATTEMPTS` (3). On final outcome it updates `inquiries.notification_status` to "sent" or "failed".
  - **Jobs stuck in PROCESSING are never recovered.**
- **Revalidation:**
  - `queue()` inserts one `revalidation_events` row per cache key.
  - `processPending(50)` (via the internal tick) just moves PENDING→PROCESSING→COMPLETED and returns the distinct `cache_keys`.
  - **It calls no frontend URL or webhook.** Public freshness relies on the Cache-Control TTLs.
- **Other jobs:** none. There is no cron library, no queue or Redis, no cleanup of `admin_sessions`, `email_oauth_states` or CLEANUP_FAILED media, and no media reprocessing.

## 5. Cross-cutting behaviour (`src/core`)
- **Success envelope:** `{success:true, data, meta:{request_id, timestamp ISO}}`. If a handler already returns `{success:true,data}`, the meta fields are merged. `@RawResponse` (CSV, SSE) bypasses the envelope; handlers using `@Res()` (robots, sitemap, OAuth redirect) write directly.
- **Error envelope:** `{success:false, error:{code, message, details?:[{field?,message}]}, meta}`.
  - Codes: BAD_REQUEST, VALIDATION_ERROR, UNAUTHENTICATED, FORBIDDEN, NOT_FOUND, CONFLICT, PAYLOAD_TOO_LARGE, UNSUPPORTED_MEDIA_TYPE, UNPROCESSABLE_ENTITY, RATE_LIMITED, INTERNAL_ERROR, UPSTREAM_ERROR, SERVICE_UNAVAILABLE.
  - Messages are Indonesian defaults per code. **The custom message is kept only if the explicit `code` is in that list.** For example, media's `MEDIA_CLEANUP_FAILED` becomes CONFLICT with the generic message "Data yang sama sudah ada."
  - Non-HTTP errors become 500 INTERNAL_ERROR.
  - Status ≥500 is logged as one JSON line (request_id, method, path, status, error_code, message) plus the stack trace.
- **Validation:** `ValidationPipe({transform, whitelist, forbidNonWhitelisted, enableImplicitConversion})`. Unknown fields are rejected. The error is 400 `VALIDATION_ERROR` with message "Periksa kembali data yang diisi." and details `[{field (dotted path), message (Indonesian, using a field-label map)}]`.
- **Pagination:** page (default 1; invalid values fall back to the default), limit (per-endpoint default, clamped to the max), `total_pages = max(1, ceil(total/limit))`. Cursor pagination is used only by the public portfolio and gallery endpoints.
- **Request ID:** an inbound `X-Request-Id` is accepted if it matches `^[A-Za-z0-9_.:-]{8,128}$`; otherwise `req_<uuid>` is generated. It is echoed in the `X-Request-Id` response header and in `meta.request_id`.
- **Logging:** the default Nest `Logger` only, with no per-request access log. Workers log warnings and errors.
- **Audit:** `AuditService.record({actorUserId, action, resourceType, resourceId, metadata})` writes synchronously in the request path. There is no read API.
- **Rate limiting:** throttler headers (`X-RateLimit-*`, `Retry-After`) are added. A 429 returns RATE_LIMITED. Throttling is keyed by client IP (X-Forwarded-For, first hop).
- **Internal endpoints:** the worker secret is compared with a plain `!==`, not constant-time.

## 6. Bulk features, templating, delete policy
- **No Excel** (no xlsx or exceljs library).
  - Bulk export: only the audience CSV (10k row cap).
  - Bulk import: recipient CSVs are parsed client-side and posted as a JSON array (max 1000; `EMAIL_CAMPAIGN_RECIPIENT_MAX` = 1000).
  - Audience and inquiry-based drafts also enforce the 1000 limit (422 when exceeded).
  - Recipients are de-duplicated by lowercased email (unique on `(campaign_id, email)`).
- **Template variables** (applied at send time):
  - Placeholder syntax `{{ key }}`, key case-insensitive, unknown keys become "".
  - Subject and text body get raw values; the HTML body gets HTML-escaped values.
  - Per-recipient `variables` JSON: keys are lowercased and must match `^[a-z0-9_]+$`, at most 50 keys, values truncated to 2000 characters.
  - `email` is always set to the recipient address; `nama` falls back to the recipient name.
  - `body_html` is used only if it contains visible text; otherwise `body_text` is converted to escaped `<p>` lines; if both are empty → 422.
- **Delete policy by resource:**
  - Content (12 resources): reversible archive/unarchive, plus a separate permanent DELETE that also removes unreferenced media.
  - Portfolio categories: delete is blocked while in use.
  - Media: archive (blocked if referenced). Permanent delete is also blocked if referenced; it deletes the storage objects, then the row. If the storage delete fails, the status becomes CLEANUP_FAILED.
  - Leads: DELETE only soft-archives (`archived_at`). There is no unarchive or hard delete, and archived leads are hidden from lists and detail.
  - Users: soft disable only.
  - Email accounts: hard delete, unless referenced by a campaign (the FK is Restrict).
  - Email templates: hard delete.
  - Campaigns: cannot be deleted.
- **Audience:**
  - Contacts are upserted by email from each inquiry. The update does not change status or consent.
  - There are **no endpoints** to add, edit, unsubscribe or block contacts, no unsubscribe link, and the MANUAL, MANUAL_IMPORT and WHATSAPP_LEAD sources are never used.
  - Only ACTIVE contacts become campaign recipients.

## 7. Environment variables
- **From `src/config/env.ts`** (validated with zod; values shown are defaults):

  | Group | Variables |
  |---|---|
  | App | NODE_ENV, API_PORT=3001, API_HOST, API_GLOBAL_PREFIX=api/v1, DATABASE_URL |
  | Auth / secrets | SESSION_COOKIE_NAME, SESSION_SECRET (≥32), ADMIN_SESSION_TTL_DAYS=7, CSRF_COOKIE_NAME, CREDENTIAL_ENCRYPTION_KEY (≥32) |
  | URLs / CORS | CORS_ORIGINS, PUBLIC_SITE_URL, PUBLIC_MEDIA_URL |
  | Uploads / media | UPLOAD_IMAGE_MAX_MB=10, UPLOAD_VIDEO_MAX_MB=100, UPLOAD_VIDEO_MAX_DURATION_SECONDS* (unused), MEDIA_THUMBNAIL_MAX_WIDTH=480, MEDIA_MEDIUM_MAX_WIDTH=960, MEDIA_LARGE_MAX_WIDTH=1600, MEDIA_VIDEO_POSTER_MAX_WIDTH* (unused), MEDIA_OBJECT_PREFIX=upload, MEDIA_STORAGE_ENV (dev\|prod), MEDIA_PATH_TIME_ZONE=Asia/Jakarta |
  | Storage | STORAGE_DRIVER (local\|s3), STORAGE_LOCAL_ROOT, S3_ENDPOINT, S3_REGION=auto, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_FORCE_PATH_STYLE=true |
  | Email / workers | INTERNAL_WORKER_SECRET (≥16), EMAIL_PROVIDER_MODE (mock\|live), SMTP_TEST_TIMEOUT_MS=10000, EMAIL_CAMPAIGN_RECIPIENT_MAX=1000, EMAIL_WORKER_BATCH_SIZE=50, EMAIL_WORKER_MAX_ATTEMPTS=3, EMAIL_WORKER_POLL_MS=60000, EMAIL_WORKER_STALE_MS=300000 |
  | Notifications | NOTIFICATION_EMAIL_ENABLED=true, NOTIFICATION_EMAIL_TO, NOTIFICATION_EMAIL_SENDER, NOTIFICATION_WORKER_BATCH_SIZE=20, NOTIFICATION_WORKER_MAX_ATTEMPTS=3, NOTIFICATION_STREAM_HEARTBEAT_MS=30000 |
  | Google OAuth | GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URI |

- **Production rules:**
  - The three secrets must not start with `development-` or `replace-with`.
  - STORAGE_DRIVER must be s3, and MEDIA_STORAGE_ENV must not be dev.
  - The S3_* variables and a valid endpoint URL are required whenever the driver is s3, in any environment.
- **Extra keys in `.env.example`:**
  - Prisma: SHADOW_DATABASE_URL (used by `prisma.config.ts`).
  - Seed: SEED_SUPER_ADMIN_{NAME,EMAIL,PASSWORD}, SEED_CONTENT_EDITOR_{NAME,EMAIL,PASSWORD}, SEED_SMTP_{EMAIL,DISPLAY_NAME,HOST,PORT,SECURITY,USERNAME,PASSWORD}.
  - Script-only: DEFAULT_MEDIA_IMPORT_GROUP (read by `sync-default-media.ts`).
- **Stale README:** it mentions `SEED_ADMIN_*`, but the code uses the names above.
- **Security flag:** `.env.example` and the `seed.ts` fallbacks contain hardcoded real-looking admin credentials.

## 8. Tests
- **Unit:** 43 `*.spec.ts` files under `src/`, about 207 `it`/`test` cases. Jest coverage thresholds are 56% branches / 59% functions / 60% lines and statements.
- **E2E:** 11 `test/*.e2e-spec.ts` files, 43 cases: admin-content 4, app 1, auth 4, core 4, dashboard 2, email-accounts 7, email-campaigns 2, leads 7, media 2, public-content 6, seo-assets 4. They run against a **real MySQL database** through PrismaService, with mock email mode and the poll disabled.

## 9. Prisma schema (`prisma/schema.prisma`)
### Database
- **Provider:** `mysql`. At runtime Prisma 7 uses `@prisma/adapter-mariadb` (the mariadb driver) against MySQL; production is MySQL on a VPS.
- **Pool:** connectionLimit 10, connectTimeout 10s, acquireTimeout 20s.
- **Tables:** utf8mb4_unicode_ci. Timestamps are `DATETIME(3)` in UTC. Enums are native MySQL `ENUM` columns. JSON fields use the MySQL `JSON` type. Media byte sizes are `BIGINT`.
- **`updated_at` is `NOT NULL` with no DB default or ON UPDATE.** Prisma sets it, so Go must set it on every insert and update.
- **Foreign keys:** all declared `ON UPDATE CASCADE`.

### Enums
| Enum | Values |
|---|---|
| UserRole | SUPER_ADMIN, CONTENT_EDITOR |
| UserStatus | ACTIVE, INACTIVE |
| ContentStatus | DRAFT, PUBLISHED, INACTIVE, ARCHIVED |
| InquiryStatus / WhatsAppLeadStatus | NEW, CONTACTED, IN_PROGRESS, CLOSED, SPAM |
| MediaKind | IMAGE, VIDEO, DOCUMENT |
| MediaStatus | PROCESSING, COMPLETED, FAILED, ARCHIVED, PENDING_DELETE, DELETED, CLEANUP_FAILED |
| EmailProviderType | GOOGLE_OAUTH, SMTP_HOSTING |
| EmailAccountStatus | CONNECTED, INVALID, DISABLED, NEEDS_RECONNECT |
| SmtpSecurityMode | SSL_TLS, STARTTLS, NONE |
| EmailCampaignStatus | DRAFT, PENDING, SENDING, COMPLETED, FAILED, CANCELLED |
| EmailRecipientStatus | QUEUED, SENDING, SENT, FAILED, SKIPPED |
| MarketingContactSource | INQUIRY, WHATSAPP_LEAD, MANUAL_IMPORT, MANUAL |
| MarketingContactStatus | ACTIVE, UNSUBSCRIBED, BLOCKED |
| MarketingConsentStatus | IMPLIED, EXPLICIT, UNKNOWN |
| RevalidationStatus | PENDING, PROCESSING, COMPLETED, FAILED |
| NotificationType | INQUIRY_CREATED, WHATSAPP_LEAD_CREATED, EMAIL_CAMPAIGN_COMPLETED, EMAIL_CAMPAIGN_FAILED, MEDIA_FAILED, SMTP_INVALID, SYSTEM_WARNING |
| NotificationSeverity | INFO, SUCCESS, WARNING, ERROR |
| NotificationEmailJobStatus | PENDING, PROCESSING, SENT, FAILED |
| EmailContentMode | TEXT, HTML |

### Models
All models have an autoincrement int `id`. Content tables also share `status`, `previous_status`, `archived_at`, `archived_by` (a plain int, **not an FK**) and `sort_order`.

| Model (table) | Key fields | FKs (onDelete) | Unique / indexes |
|---|---|---|---|
| User (users) | name, email, password_hash, role, status, last_login_at | – | email unique |
| AdminSession (admin_sessions) | token_hash, user_agent, ip_hash, expires_at, revoked_at | user_id→users (Cascade) | token_hash unique; idx user_id; idx expires_at |
| SiteSettings (site_settings) | singleton id=1 with defaults; brand, legal_name, email, phone, whatsapp, instagram, contact_person, contact_role, address, seo_title, seo_description, show_brand_text | logo_media_file_id, footer_logo_media_file_id, og_media_file_id, contact_hero_media_file_id →media_files (SetNull) | – |
| HeroSection (hero_sections) | title, subtitle, cta_label, cta_href; status default PUBLISHED | – | (status, archived_at) |
| HeroSlide (hero_slides) | label, title, metric, alt_text | hero_section_id→hero_sections (Cascade); media_file_id→media (SetNull) | (hero_section_id, sort_order), (status, sort_order), (status, archived_at) |
| Partner (partners) | name, segment | logo_media_id→media (SetNull) | (status, sort_order), (status, archived_at) |
| ProductionStrength (production_strengths) | label, value, suffix | – | (status, sort_order), (status, archived_at) |
| PortfolioCategory (portfolio_categories) | name, slug | – | name unique, slug unique; (status, sort_order), (status, archived_at) |
| Portfolio (portfolios) | title, slug, category (denormalized text), description, featured, published_at, seo_*; status default DRAFT | category_id→categories (SetNull); image_media_id→media (SetNull) | slug unique; (status, featured, sort_order), (status, category, sort_order), (status, category_id, sort_order), (status, archived_at) |
| PortfolioImage (portfolio_images) | sort_order | portfolio_id→portfolios (Cascade); media_file_id→media (**Cascade**) | (portfolio_id, media_file_id) unique; (portfolio_id, sort_order), (media_file_id) |
| Machine (machines) | name, slug, metric, description | image_media_id (SetNull) | slug unique; (status, sort_order), (status, archived_at) |
| PrintingCapacity (printing_capacities) | label, value, unit, description | image_media_id (SetNull) | (status, sort_order), (status, archived_at) |
| ProductionCapacity (production_capacities) | product, value, unit | – | (status, sort_order), (status, archived_at) |
| ServiceItem (services) | name | – | (status, sort_order), (status, archived_at) |
| GalleryItem (gallery_items) | type (MediaKind), caption, published_at; status default DRAFT | media_file_id, poster_media_id (SetNull) | (status, sort_order), (status, published_at), (status, archived_at) |
| NewsArticle (news) | title, slug, category, excerpt, content (JSON), published_at, seo_*; status default DRAFT | thumbnail_media_id, og_media_id (SetNull) | slug unique; (status, published_at), (status, category, published_at), (status, archived_at) |
| Inquiry (inquiries) | name, email, phone, company, message (TEXT), status, internal_note, notification_status, source, meta (JSON), archived_at | – | (status, created_at), (email) |
| WhatsAppLead (whatsapp_leads) | name, phone, message, whatsapp_url, status, internal_note, source, meta, archived_at | – | (status, created_at), (phone) |
| MediaFile (media_files) | kind, status, original_filename, mime_type, extension, object_key, public/thumbnail/medium/large/poster/video URLs, size_original_bytes/size_final_bytes (BIGINT), width, height, duration_seconds, checksum (unused), variants (JSON), error_message, previous_status, archived_at/by, deleted_at/by | created_by_id→users (SetNull) | object_key unique; (kind, status, created_at), (status, archived_at), (status, deleted_at), (created_by_id) |
| EmailAccount (email_accounts) | provider, email, display_name, status (default DISABLED), google_subject, encrypted_access_token, encrypted_refresh_token, token_expires_at, smtp_host, smtp_port, smtp_security, smtp_username, encrypted_smtp_password, last_test_at, connected_at, last_error | – | (provider, email) unique; (status, provider) |
| EmailOAuthState (email_oauth_states) | state_hash, email_hint, display_name, expires_at, consumed_at | admin_user_id→users (SetNull) | state_hash unique; (admin_user_id), (expires_at) |
| MarketingContact (marketing_contacts) | email, name, phone, company, source, source_ref_id, status, consent_status, tags (JSON, unused), last_interaction_at | – | email unique; (status, created_at), (source, source_ref_id), (last_interaction_at) |
| EmailCampaign (email_campaigns) | name, subject, body_text, body_html, status, total_recipients, queued_count, sent_count, failed_count, locked_at, started_at, finished_at, last_error | sender_account_id→email_accounts (**Restrict**); created_by_id→users (SetNull) | (status, created_at), (sender_account_id) |
| EmailCampaignRecipient (email_campaign_recipients) | email, name, variables (JSON), status, attempts, next_attempt_at, locked_at, sent_at, failed_at, error_code, error_message | campaign_id (Cascade); marketing_contact_id (SetNull) | (campaign_id, email) unique; (campaign_id, status), (marketing_contact_id), (status, next_attempt_at) |
| EmailSendLog (email_send_logs) | provider, status (string), message_id, error_code, error_message, response_meta (JSON) | campaign_id (Cascade); recipient_id (SetNull) | (campaign_id, created_at), (recipient_id) |
| EmailTemplate (email_templates) | name, subject, content_mode, body_text, body_html | – | (name) |
| RevalidationEvent (revalidation_events) | resource_type, resource_id, cache_key, status, attempts, last_error, processed_at | – | (status, created_at), (resource_type, resource_id) |
| AuditLog (audit_logs) | action, resource_type, resource_id, ip_hash, user_agent, metadata (JSON) | actor_user_id→users (SetNull) | (actor_user_id, created_at), (resource_type, resource_id), (action, created_at) |
| Notification (notifications) | type, severity, title, message, resource_type, resource_id, actor_type, actor_id, expires_at | – | (created_at), (type, created_at), (resource_type, resource_id) |
| NotificationRead (notification_reads) | read_at | notification_id (Cascade); user_id (Cascade) | (notification_id, user_id) unique; (user_id, read_at) |
| NotificationEmailJob (notification_email_jobs) | recipient_email, subject, body_text, body_html, status, attempts, next_attempt_at, locked_at, last_error, sent_at | notification_id (SetNull) | (status, next_attempt_at, created_at), (notification_id) |

### Migrations (16, `prisma/migrations`)
These contain data backfills that the golang-migrate baseline must reflect:
- `portfolio_categories`: seeds 8 categories, creates `kategori-<md5 prefix>` categories from legacy text values, and backfills `category_id`.
- `portfolio_images`: copies the cover image in as image #0.
- `site_logo_only_default`: sets `show_brand_text = false`.

### seed.ts and sync-default-media.ts
- **`prisma/seed.ts`** (run on every seed):
  - Upserts two users (super admin and content editor) from the SEED_* env vars with hardcoded fallbacks. **It resets their password hash and ACTIVE status every run.**
  - If any SEED_SMTP_* variable is set: runs a real nodemailer verify, then upserts that SMTP account as CONNECTED or INVALID, encrypted with the same AES-GCM scheme.
  - Upserts `site_settings` id=1, **overwriting the brand, contact and SEO fields every run**.
  - Creates the 8 portfolio categories if missing (create-only).
- **`prisma/sync-default-media.ts`** (`npm run db:sync-default-media`):
  - Validates env and picks the S3 or local storage driver.
  - Walks a 59-asset manifest: logo, 3 hero, 4 machine, 3 news, 6 portfolio and 3 printing images, plus 39 partner logos.
  - If a source file exists in `prisma/default-media` (**only `logo-indobraga-kuning.png` does**), it makes three WebP variants and uploads them.
  - Otherwise it creates metadata-only media rows pointing at deterministic keys `${prefix}/${env}/${category}/${DEFAULT_MEDIA_IMPORT_GROUP\|default}/${slug}-{variant}.webp`, assuming those objects already exist in the bucket. Media rows are upserted by `object_key`.
  - It then idempotently upserts the default content by natural keys:
    - site_settings: the logo only if unset or already the default logo; the contact hero and OG image always.
    - 1 hero section with 2 slides.
    - 39 partners.
    - 8 categories.
    - 8 featured, published portfolios with 1–3 gallery images each.
    - 4 strengths, 4 machines, 3 printing capacities, 5 production capacities, 9 services.
    - 3 news articles and 9 gallery items.

### Parity risks and quirks to decide on
1. **Gmail token refresh is missing** (Gmail accounts break after about an hour).
2. **The notification email worker is not scheduled in-app** and has no stale-lock recovery.
3. **Possible route shadowing:** `PATCH /admin/:resource/:id/archive` in admin-content is probably registered before media's `PATCH /admin/media/:id/archive`. If so, the frontend's media archive call would get 400 "Menu konten tidak dikenal." This was not runtime-verified and there is no e2e coverage. In Go 1.22 ServeMux the more specific media pattern wins.
4. **Guards hardcode `/api/v1/admin/`.**
5. **100kb JSON body limit.**
6. **The error filter discards codes outside its list** (and their messages).
7. **Single-instance only:** the throttler and SSE state are in memory.
8. **Unused pieces:** `file-type`, `checksum`, `tags`, two env vars, several enum values, two permissions, the media "retry" endpoint (effectively a no-op), and the DOCUMENT media kind.
9. **Local storage files are not served by the API.**
10. **`updated_at` has no DB default** and must be set by the application.
