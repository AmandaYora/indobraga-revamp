# Module Map

> Status: rancangan PLAN-01 (sumber: `plans/PLAN-03-backend.md` §3.1). Difinalkan di PLAN-03 dan
> PLAN-02. "Owned tables" adalah indeks nama saja — detail skema di `DATABASE.md`.

## Backend (`apps/api/internal/modules/`)

| Modul | Tanggung jawab | Public contract | Owned tables | External integrations |
|---|---|---|---|---|
| auth | Login/logout/me, sesi, CSRF, guard permission | `Authenticator`, `Permission`, peta role | `admin_sessions` | – |
| users | Manajemen user admin, kredensial | `UserClient` (GetByID, GetMany, VerifyCredentials, TouchLastLogin); event `user.deactivated`, `user.password_changed` | `users` | – |
| audit | Pencatatan audit | `AuditClient.Record` | `audit_logs` | – |
| media | Upload, pipeline gambar, arsip/hapus, hitung referensi | `MediaClient` (GetPreviews, EnsureCompleted, DeleteIfUnused, PingStorage); interface `ReferenceProvider` | `media_files`, `media_variants` | S3 IDCloudHost |
| settings | Pengaturan situs (singleton) | `SettingsClient` (Get, WhatsAppNumber, ContactEmail, SeoDefaults) | `site_settings` | – |
| profile | Hero, slide, partner, keunggulan, mesin, kapasitas cetak & produksi, layanan | `ProfileClient` (HomeBlocks, FacilitiesBlocks) | `hero_sections`, `hero_slides`, `partners`, `production_strengths`, `machines`, `printing_capacities`, `production_capacities`, `services` | – |
| portfolio | Kategori, portofolio, gambar portofolio | `PortfolioClient` (Featured, Counts) | `portfolio_categories`, `portfolios`, `portfolio_images` | – |
| gallery | Item galeri | `GalleryClient` (Counts) | `gallery_items` | – |
| news | Berita | `NewsClient` (Latest, BySlugForSeo, SitemapEntries, Counts) | `news` | – |
| site | Orkestrasi publik: home, fasilitas, SEO, robots, sitemap, SPA shell, cache publik | – | – | – |
| leads | Pesan kontak, prospek WhatsApp | `LeadClient` (InquiryRecipients, Counts, Latest); event `inquiry.created`, `whatsapp_lead.created` | `inquiries`, `whatsapp_leads` | – |
| audience | Kontak marketing | `AudienceClient` (EligibleRecipients, Preview) | `marketing_contacts` | – |
| notifications | Notifikasi, status baca, email notifikasi, SSE | event `notification_email.finished` | `notifications`, `notification_reads`, `notification_email_jobs` | – (kirim lewat emailaccounts) |
| emailaccounts | Akun Google & SMTP, OAuth, pengiriman | `AccountClient` (Sender, MarkNeedsReconnect, NotificationSender); interface `UsageChecker` | `email_accounts`, `email_oauth_states` | Google OAuth, Gmail API, SMTP |
| emailtemplates | Template email | – | `email_templates` | – |
| campaigns | Kampanye, penerima, log kirim, worker | `CampaignClient` (Counts, Latest); implementasi `UsageChecker` | `email_campaigns`, `email_campaign_recipients`, `email_send_logs` | – (kirim lewat emailaccounts) |
| dashboard | Ringkasan admin | – | – | – |
| health | Health check | – | – | – (ping storage lewat media) |

## Frontend (`apps/web/src/modules/`)

| Modul | Halaman / isi | Memakai API modul |
|---|---|---|
| auth | Login, auth store, guard, helper permission | auth |
| site | Shell publik, header/footer, site settings store, `<Seo>`, Kontak, Not Found, Pengaturan admin | settings, site |
| home | Beranda | site |
| profile | Fasilitas (publik); hero, partner, keunggulan, mesin & kapasitas, layanan (admin) | site, profile |
| portfolio | Portofolio + modal (publik); portofolio & kategori (admin) | portfolio |
| gallery | Galeri + lightbox (publik); galeri (admin) | gallery |
| news | Daftar & detail berita (publik); berita (admin) | news |
| leads | Form inquiry, WhatsApp FAB; pesan kontak & prospek (admin) | leads |
| media | Upload, galeri media, pustaka media, kompresi gambar | media |
| content | Mesin ResourceManager generik (dipakai modul konten) | – |
| email | Akun email, email blast, template, riwayat | emailaccounts, emailtemplates, campaigns |
| notifications | Bell, dropdown, SSE | notifications |
| dashboard | Dashboard admin | dashboard |
| users | Manajemen user | users |
