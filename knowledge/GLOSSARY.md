# Glossary

Istilah UI (Indonesia) ↔ istilah kode/API. Teks UI memakai kolom pertama; nama di kode memakai
kolom kedua.

| UI | Kode / API | Keterangan |
|---|---|---|
| Pesan kontak | `inquiry`, tabel `inquiries` | Dari form `/kontak` |
| Prospek WhatsApp | `whatsapp lead`, `whatsapp_leads` | Dari WhatsApp FAB |
| Leads | modul `leads` | Pesan kontak + prospek WhatsApp |
| Audiens / kontak marketing | `marketing contact`, `marketing_contacts`, modul `audience` | Di-upsert otomatis dari pesan kontak |
| Email massal / email blast / kampanye | `campaign`, `email_campaigns` | Satu pengiriman ke banyak penerima |
| Penerima | `recipient`, `email_campaign_recipients` | Status: `queued`, `sending`, `sent`, `failed`, `skipped` |
| Log pengiriman | `send log`, `email_send_logs` | Setiap percobaan kirim (hanya super admin) |
| Akun pengirim / akun email | `email account`, provider `google` / `smtp` | Google = OAuth + Gmail API |
| Perlu dihubungkan ulang | `needs_reconnect` | Akun email gagal autentikasi |
| Template email | `email template`, `content_mode` `text`/`html` | |
| Variabel | `{{ key }}` di subject/isi | Key lowercase `a-z0-9_` |
| Konten | modul `profile`, `portfolio`, `gallery`, `news`, `settings` | Dikelola admin |
| Tayang | `published` | |
| Draf | `draft` | Default saat membuat konten |
| Nonaktif | `inactive` | |
| Arsip / pulihkan | `archived` + `previous_status` / `unarchive` | Reversible |
| Hapus permanen | `DELETE` konten | Menghapus media yang tidak dipakai lagi |
| Hero & slide | `hero_sections`, `hero_slides` | Beranda |
| Partner / klien | `partners` (`segment`) | Carousel logo |
| Keunggulan produksi | `production_strengths` | Stat tile |
| Mesin | `machines` | |
| Kapasitas cetak | `printing_capacities` | |
| Kapasitas produksi | `production_capacities` | |
| Layanan | `services` | |
| Portofolio & kategori | `portfolios`, `portfolio_categories`, `portfolio_images` | Gambar pertama = cover |
| Galeri | `gallery_items` (`type` `image`/`video`) | |
| Berita | `news` | `content` = array paragraf |
| Media siap pakai | media `completed` | Varian WebP sudah jadi |
| Pustaka media | media library | |
| Pengaturan situs | `site_settings` (singleton) | Termasuk SEO default & nomor WhatsApp |
| Notifikasi | `notifications`, `notification_reads` | Realtime via SSE |
| Super admin / Content editor | role `super_admin` / `content_editor` | |
| Sesi | `admin_sessions` | Cookie httpOnly (ADR-0006) |
| Perubahan perilaku (BC) | `BC-xx` | Penyimpangan terencana dari legacy (ADR-0012) |
| Legacy | repo `indobraga/` | Sistem lama (NestJS + TanStack Start) |
