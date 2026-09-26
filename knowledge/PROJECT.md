# Project Brief — Indobraga

## Apa dan mengapa

Website **company profile** modern untuk perusahaan garment **Indobraga** (nama legal **PT. Braga
Indonesia Perkasa**) beserta **dashboard admin** untuk mengelola konten dan prospek. Tujuannya:
kredibilitas digital yang visual, ringan, SEO-friendly, dan bisa diperbarui tim internal tanpa
developer. Pesan utama: *"Dipercaya oleh lebih dari 250+ bisnis di berbagai industri."*

Repo ini adalah **revamp** dari aplikasi legacy (`indobraga/`, NestJS + TanStack Start SSR) menjadi
Dimas Monorepo Standard dengan backend Go. Syarat utama revamp: **tidak ada desain maupun kapabilitas
yang hilang**; dari sudut pandang user tidak ada yang berbeda kecuali perbaikan yang tercatat (BC,
ADR-0012). Rencana eksekusi: `plans/`.

## Persona

| Persona | Kebutuhan |
|---|---|
| Pengunjung / calon klien (bisnis, brand, komunitas, institusi) | Melihat portofolio, fasilitas, galeri, berita; menghubungi lewat form kontak atau WhatsApp |
| Super admin | Mengelola semua konten, media, user, akun email, kampanye, termasuk log pengiriman |
| Content editor | Sama dengan super admin kecuali log pengiriman kampanye & aktivitas; tidak bisa melihat/mengelola super admin |

Bahasa UI: Indonesia, istilah bisnis (bukan istilah teknis developer).

## Fitur publik

- **Beranda**: hero slide, statistik, carousel logo klien, keunggulan produksi, portofolio unggulan,
  mesin & kapasitas, layanan, berita terbaru, CTA.
- **Portofolio**: filter kategori, "Muat lagi", modal carousel multi-gambar.
- **Fasilitas**: keunggulan, total kapasitas bulanan, kapasitas cetak, mesin, layanan.
- **Galeri**: gambar & video dengan lightbox, "Muat lagi".
- **Berita**: daftar berpaginasi dan detail artikel.
- **Kontak**: info perusahaan + form pesan (nama, email, telepon, perusahaan, pesan) dengan honeypot.
- **WhatsApp FAB** di semua halaman publik: form singkat (nama, telepon) → tercatat sebagai prospek →
  diarahkan ke WhatsApp Indobraga dengan pesan terisi.
- SEO: title/meta/OG/canonical/JSON-LD per halaman, `robots.txt`, `sitemap.xml`.

## Fitur admin

- **Dashboard**: ringkasan pesan kontak, prospek WhatsApp, berita tayang, portofolio aktif, media siap
  pakai, email massal menunggu; daftar terbaru.
- **Konten**: hero & slide, partner/klien, keunggulan, layanan, mesin + kapasitas cetak & produksi,
  kategori portofolio, portofolio (maks 10 gambar), galeri, berita — dengan status draf/tayang/
  nonaktif, arsip/pulihkan, hapus permanen.
- **Media**: upload (kompresi di browser + varian WebP di server), pustaka media, arsip, hapus.
- **Pengaturan situs**: identitas, kontak, WhatsApp, logo navbar & footer, hero kontak, SEO default.
- **Leads**: pesan kontak & prospek WhatsApp — status, catatan internal, arsip, aksi kirim email /
  WhatsApp.
- **Email**: akun pengirim (Google OAuth/Gmail API, SMTP hosting), email blast single & bulk (impor
  XLSX, variabel `{{var}}`, preview), template, riwayat kampanye + penerima + log, kirim ulang yang gagal.
- **Notifikasi realtime** (SSE) untuk pesan & prospek baru, email notifikasi ke admin.
- **User**: kelola admin (super admin & content editor) dengan aturan perlindungan diri.

## Lingkup revamp

- **Dalam lingkup**: semua fitur di atas (paritas penuh), migrasi seluruh data produksi, VPS baru.
- **Perbaikan yang disetujui**: BC-01..BC-15, BC-20..BC-28 (ADR-0012).
- **Di luar lingkup** (backlog, butuh persetujuan): UI manajemen audience & export CSV, reorder
  drag-and-drop, draft kampanye dari inquiry/audience via UI, filter portofolio di URL, pagination
  media library, notifikasi tambahan, pembatalan kampanye, dark mode, retry media yang memproses ulang.

Sumber rinci: `analysis/000-legacy-inventory/PRD-legacy.md` (PRD legacy apa adanya),
`analysis/000-legacy-inventory/{backend,frontend}.md` (inventaris perilaku).
