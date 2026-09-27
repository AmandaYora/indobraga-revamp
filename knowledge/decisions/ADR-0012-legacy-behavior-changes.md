# ADR-0012: Perubahan perilaku terhadap legacy (BC)

## Status
Accepted — 2026-09-26. Menambah BC baru hanya lewat amandemen ADR ini dengan persetujuan Dimas.

## Context
Revamp menargetkan paritas dari sudut pandang user, tetapi analisis legacy menemukan bug dan perilaku
yang tidak ideal. Setiap penyimpangan dari legacy harus disengaja, tercatat, dan teruji — tidak ada
perubahan perilaku diam-diam.

## Decision
Perubahan berikut disetujui. Kolom "Bukti" diisi nama test saat diimplementasikan — selama testing
ditangguhkan (ADR-0011), kolom ini diisi lokasi implementasi (`file:baris`).

| ID | Perubahan | Alasan | Bukti (test) |
|---|---|---|---|
| BC-01 | Access token Gmail di-refresh otomatis; `needs_reconnect` hanya bila refresh gagal | Legacy tidak pernah memakai refresh token → akun Gmail putus ±1 jam | _PLAN-03 B8_ |
| BC-02 | Worker email notifikasi terjadwal in-app + pemulihan job macet | Legacy hanya jalan bila endpoint tick dipanggil dari luar | _PLAN-03 B7_ |
| BC-03 | Mode mock juga berlaku untuk email notifikasi | Dev/test legacy bisa mengirim email sungguhan | _PLAN-03 B7_ |
| BC-04 | Kode & pesan error domain dipertahankan | Filter legacy melebur kode di luar daftar menjadi pesan generik yang menyesatkan | _PLAN-03 B1_ |
| BC-05 | Arsip media tidak tertutup route arsip konten generik | Potensi shadowing route di legacy | _PLAN-03 B4/B5_ |
| BC-06 | Batas body JSON 1 MB default; draft kampanye sesuai ukuran maksimum valid | Default Express 100 KB bisa menolak draft 1.000 penerima | _PLAN-03 B1/B9_ |
| BC-07 | Tanpa kredensial hardcoded di seed & `.env.example` | Kredensial tampak nyata ada di repo legacy (public) | _PLAN-03 B10_ |
| BC-08 | Pembersihan berkala sesi kedaluwarsa & OAuth state | Tabel legacy tumbuh tanpa batas | _PLAN-03 B3_ |
| BC-09 | Compare constant-time (worker secret, CSRF); CR/LF header email notifikasi dibuang | Hardening | _PLAN-03 B1/B7_ |
| BC-10 | `created_at`/`updated_at` default DB | Legacy bergantung pada ORM | _PLAN-03 B2_ |
| BC-11 | Audit mengisi `ip_hash` & `user_agent`; modul users ikut menulis audit | Kolom legacy selalu kosong; aksi user tak teraudit | _PLAN-03 B3_ |
| BC-12 | Revalidation diganti invalidasi cache in-process; `pending_revalidation` dihapus dari API dashboard | Legacy mencatat event tanpa efek; field tidak tampil di UI | _PLAN-03 B6_ |
| BC-13 | Enum DB = nilai API lowercase; `email_campaigns.name` → `title`; `SENDING` → `processing` | Hilangkan lapisan mapping | _PLAN-03 B2_ |
| BC-14 | Dimensi media disimpan setelah orientasi EXIF | Legacy menyimpan dimensi sebelum rotasi | _PLAN-03 B4_ |
| BC-15 | Email via Gmail API multipart/alternative (teks + HTML) | Legacy membuang versi teks khusus Gmail | _PLAN-03 B8_ |
| BC-20 | Tepat satu canonical per halaman publik; `/login` & `/admin*` noindex tanpa canonical | Legacy kemungkinan mengeluarkan dua canonical | _PLAN-02 F2 / PLAN-04 INT-11_ |
| BC-21 | SEO title/description/OG dari Pengaturan admin menjadi default situs | Field admin legacy tidak dipakai frontend | _PLAN-03 B6 / PLAN-02 F2_ |
| BC-22 | Route/slug tidak ada → HTTP 404 + halaman Not Found | Legacy soft-404 (HTTP 200) | _PLAN-03 B6 / PLAN-02 F2_ |
| BC-23 | Logo, nomor WA, kontak tersedia sejak paint pertama | Legacy menukar logo setelah mount | _PLAN-02 F2_ |
| BC-24 | Preview HTML email di iframe sandbox | Legacy `dangerouslySetInnerHTML` tanpa sanitasi | _PLAN-02 F7_ |
| BC-25 | `/login` me-redirect user yang sudah login; kembali ke tujuan setelah login | UX | _PLAN-02 F4_ |
| BC-26 | Data `me` diambil sekali per sesi aplikasi | Legacy fetch 3× per halaman | _PLAN-02 F4_ |
| BC-27 | Input pencarian top bar admin menjadi pencarian menu | Input legacy tidak berfungsi | _PLAN-02 F4_ |
| BC-28 | Font di-self-host (tampilan identik) | Tanpa request pihak ketiga, preload lebih cepat | _PLAN-02 F1_ |

### Usulan BC — MENUNGGU PERSETUJUAN DIMAS (belum berlaku)

Ditemukan saat verifikasi & revisi kontrak 2026-09-27. Sampai disetujui, perilaku mengikuti legacy
kecuali disebut lain di kolom "Status sementara".

| ID | Usulan | Alasan / bukti legacy | Status sementara |
|---|---|---|---|
| BC-16 | Callback Google OAuth mengabaikan parameter tambahan dari Google (`scope`, `authuser`, `prompt`, `hd`, …) | Legacy menolak dengan 400 karena `forbidNonWhitelisted` pada `GoogleOAuthCallbackQueryDto`, sehingga alur Google sungguhan kemungkinan gagal di produksi | Kontrak sudah menulis "diabaikan" (`x-unknown-query: ignore`) |
| BC-17 | Impor XLSX penerima & unduh template XLSX berfungsi | Legacy memanggil `read-excel-file` v9 / `write-excel-file` v4 dengan API lama → impor tidak membaca baris, unduhan tidak terjadi | Sudah diperbaiki di frontend (fitur PRD, bukan perubahan desain) |
| BC-18 | Reorder dengan ID tak dikenal → 404 `NOT_FOUND` | Legacy 500 (Prisma P2025 tidak ditangkap) | Kontrak mendokumentasikan 500 (paritas) |
| BC-19 | Tipe JSON kanonik di kontrak (mis. `is_featured` boolean); legacy mengonversi implisit (`"5"`→5) | Frontend selalu mengirim tipe benar; tidak terlihat user | Kontrak tipe kanonik; backend Go boleh tetap toleran |
| BC-29 | Toast sukses/gagal setelah kembali dari Google OAuth | Legacy tidak memberi umpan balik sama sekali | Mengikuti legacy (tanpa toast); query dibersihkan dari URL |
| BC-30 | Angka awal pagination "start–end" benar (1-based) | Legacy menampilkan `start+1` (selisih satu) | Sudah diterapkan di `TablePagination` bersama |
| BC-31 | Tombol simpan modal dikunci selama proses (cegah submit ganda) | Legacy bisa terkirim dua kali bila diklik cepat; tampilan tombol sama | Sudah diterapkan di modal template/akun email |
| BC-32 | Query `connected/status/reason` dibersihkan dari URL setelah kembali dari OAuth | Legacy membiarkannya di URL | Sudah diterapkan (tanpa toast, paritas) |
| BC-33 | Setelah kirim email, draf direset sehingga kirim berikutnya membuat kampanye baru | Legacy menyimpan `draftId` sehingga kirim kedua ditolak server | Mengikuti legacy |
| BC-34 | Input file XLSX di-reset setelah unggah (file yang sama bisa dipilih ulang) | Legacy tidak me-reset | Mengikuti legacy |

Kapabilitas yang tidak diubah tetapi dicatat sebagai backlog (tidak dikerjakan tanpa persetujuan)
ada di `plans/README.md` §Backlog.

## Consequences
- Setiap BC wajib punya test otomatis sebelum plan terkait dinyatakan selesai.
- Selisih visual terhadap baseline hanya sah bila merujuk ID BC di tabel ini.
