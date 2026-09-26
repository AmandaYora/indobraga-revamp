# Architecture

## Topologi

```txt
Browser ──HTTPS──► Nginx (host VPS) ──► container app :8080 (loopback)
                                          ├── /api/v1/*            → modul Go (JSON, SSE, CSV)
                                          ├── /robots.txt, /sitemap.xml → modul site
                                          ├── /assets/*, file statis → PUBLIC_DIR (immutable)
                                          └── route lain           → SPA shell (head + bootstrap, ADR-0005)
container app ──► MySQL 8 (host, via host.docker.internal)
              ──► S3 IDCloudHost (media, public-read)
              ──► SMTP hosting / Gmail API / Google OAuth
Browser ──► PUBLIC_MEDIA_URL (gambar langsung dari bucket/CDN)
```

Satu repo, dua app: `apps/web` (React 19 SPA, build statis) dan `apps/api` (Go modular monolith).
Satu container di produksi (ADR-0013). Di dev: `npm run dev:web` (Vite :5173, proxy `/api` →
:8080) dan `npm run dev:api` (Air) — dua perintah terpisah, satu origin, tanpa CORS.

## Alur request

1. **Halaman publik, load pertama**: `GET /portfolio` → modul `site` mencocokkan route → ambil data
   halaman + SEO + site settings (cache in-process) → isi `<!--app-head-->` (title, meta, canonical,
   OG, JSON-LD, preload) dan `<!--app-bootstrap-->` (JSON) di `index.html` → browser render SPA
   memakai bootstrap tanpa request API tambahan.
2. **Navigasi client**: react-router loader memanggil `GET /api/v1/public/...` + `GET /api/v1/public/seo?path=`
   secara paralel; `<Seo>` mengganti tag head.
3. **Admin**: SPA shell tanpa data (noindex, `no-store`) → guard `requireAuth` memanggil
   `GET /api/v1/auth/me` sekali → request admin membawa cookie sesi; mutasi membawa `x-csrf-token`.
4. **Middleware API** (urutan): recover → request-id → real IP → access log → security headers →
   rate limit → body limit → sesi → CSRF → handler (cek permission).

## Batas modul

- Backend: setiap modul di `apps/api/internal/modules/<m>/` hanya membuka `contracts/`. Import lintas
  modul selain `contracts/`, join/FK lintas modul dilarang (archtest di CI). Peta: `MODULE_MAP.md`.
- Dependensi melingkar diputus dengan **provider interface** (didefinisikan di contract modul
  penyedia, diimplementasikan modul lain, didaftarkan saat wiring) atau **event**.
- Wiring seluruh modul di satu tempat: `apps/api/internal/app/wire.go`.
- Frontend: `apps/web/src/modules/<m>/` mengekspor API publik lewat `index.ts`; `shared/` hanya
  komponen & utilitas domain-agnostic.

## Side effect & background (ADR-0009)

| Pemicu | Event | Subscriber |
|---|---|---|
| Pesan kontak dibuat | `inquiry.created` | audience (upsert kontak), notifications (notifikasi + job email) |
| Prospek WhatsApp dibuat | `whatsapp_lead.created` | notifications |
| Job email notifikasi selesai | `notification_email.finished` | leads (isi `notification_status`) |
| User dinonaktifkan / password diganti | `user.deactivated`, `user.password_changed` | auth (cabut sesi) |
| Konten/settings/media berubah | `content.changed{keys}` | site (invalidasi cache publik) |

Scheduler in-process: worker kampanye, worker email notifikasi, janitor sesi/OAuth state. Klaim job
lewat UPDATE bersyarat + `locked_at` (aman multi-instans). SSE hub in-memory untuk notifikasi.

## Keamanan

Cookie sesi httpOnly + CSRF double-submit (ADR-0006), permission per route (`x-permission` di
kontrak), rate limit per IP, security headers setara helmet, CSP untuk shell HTML, secret akun email
dienkripsi AES-256-GCM, tidak ada secret di repo (repo GitHub bersifat public).
