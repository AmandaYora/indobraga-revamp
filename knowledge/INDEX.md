# Knowledge Index — indobraga

Routing untuk satu-satunya rak pengetahuan proyek. Baca file yang relevan sebelum mengubah kode.
Tidak ada `docs/` paralel; bila dua sumber bertentangan ikuti [SOURCE_PRIORITY.md](SOURCE_PRIORITY.md)
dan laporkan konfliknya.

| File | Isi | Baca saat |
|---|---|---|
| [SOURCE_PRIORITY.md](SOURCE_PRIORITY.md) | Sumber mana yang menang bila bertentangan | Ada keraguan fakta |
| [PROJECT.md](PROJECT.md) | Tujuan bisnis, persona, fitur, lingkup | Memulai fitur apa pun |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Topologi, alur request, SEO shell, worker & event | Menyentuh lintas app/modul |
| [MODULE_MAP.md](MODULE_MAP.md) | Modul backend & frontend: tanggung jawab, contract, tabel, integrasi | Menambah/mengubah modul |
| [GLOSSARY.md](GLOSSARY.md) | Istilah domain Indonesia ↔ kode | Menamai hal baru, menulis teks UI |
| [API.md](API.md) | Konvensi API v1 + indeks endpoint per modul | Menyentuh endpoint/kontrak |
| [DATABASE.md](DATABASE.md) | Konvensi DB + tabel per modul | Menulis migration/query |
| [FRONTEND.md](FRONTEND.md) | Struktur `apps/web`, desain, data, SEO client, test | Menyentuh `apps/web` |
| [BACKEND.md](BACKEND.md) | Struktur `apps/api`, contracts, event, scheduler, error | Menyentuh `apps/api` |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Dev lokal, toolchain, env, build, Docker, VPS | Setup mesin, deploy, env |
| [decisions/](decisions/) | ADR-0001..0013 | Sebelum mengubah keputusan apa pun |

Di luar `knowledge/`:

- `plans/` — rencana eksekusi revamp (PLAN-01..05) dan daftar perubahan perilaku (BC). Dibekukan ke
  `analysis/001-revamp-plans/` setelah PLAN-05 selesai.
- `analysis/000-legacy-inventory/` — snapshot sistem legacy (acuan paritas, tidak diedit).
- `packages/api-contract/` — kontrak OpenAPI v1 (sumber kebenaran antarmuka, ADR-0004).
