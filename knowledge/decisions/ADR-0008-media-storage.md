# ADR-0008: Penyimpanan & pipeline media

## Status
Accepted — 2026-09-26 (pipeline bergantung benchmark gate PLAN-03 §3.5)

## Context
Legacy menyimpan media di bucket S3-compatible IDCloudHost, memproses gambar dengan sharp (libvips)
menjadi 3 varian WebP, dan menyimpan 6 URL absolut per media di DB. Revamp pindah ke VPS baru, tetapi
URL gambar yang dilihat pengunjung tidak boleh berubah.

## Decision
- **Bucket & prefix yang sama** (`upload/{env}/...`) dan `PUBLIC_MEDIA_URL` yang sama → URL identik,
  tanpa penyalinan objek. Aplikasi baru memakai access key S3 baru; key legacy dicabut saat
  decommission.
- DB menyimpan **object key per varian** (`media_variants`); URL publik diturunkan
  `PUBLIC_MEDIA_URL + "/" + key` (segmen di-URI-encode). Ganti CDN/bucket cukup ubah env.
- Upload diproksikan lewat API (tanpa presigned URL, paritas). PutObject dengan `ACL public-read`,
  `Cache-Control: public, max-age=31536000, immutable`.
- Gambar: deteksi magic bytes (WebP/PNG/JPEG), tolak > 100 MP sebelum decode penuh, auto-orient EXIF,
  varian lebar 480/960/1600 tanpa upscale, WebP q82, upload paralel dengan rollback. Dimensi yang
  disimpan = dimensi setelah orientasi (BC-14). File asli tidak disimpan (paritas).
- Video (MP4 `ftyp`) disimpan apa adanya.
- **Implementasi Go murni tanpa cgo** (build lintas OS termasuk Windows, image statis).
  Libvips/govips hanya bila benchmark gate gagal (SSIM ≥ 0,98 vs sharp, ukuran ±15%, p95 ≤ 2 dtk
  untuk 12 MP) — lewat amandemen ADR ini.
- Driver `local` untuk dev, dan Go menyajikan file lokal di dev (legacy tidak).

## Consequences
- Tidak ada migrasi objek media; ETL hanya mengubah URL → key dan memverifikasi keberadaan objek.
- Hasil WebP tidak identik byte-per-byte dengan sharp, tetapi setara secara visual (diukur).
