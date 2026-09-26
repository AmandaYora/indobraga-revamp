# Source Priority

Bila dua sumber bertentangan, yang lebih tinggi menang — tetapi konflik nyata **tidak pernah**
diselesaikan diam-diam. Laporkan sebagai temuan.

1. `knowledge/decisions/ADR-*` — keputusan yang sudah disahkan (termasuk daftar BC di ADR-0012)
2. Dimas Monorepo Standard + `.claude/rules/`
3. `packages/api-contract/openapi.yaml` — antarmuka web ↔ api
4. Kode, konfigurasi, migration aktif
5. `knowledge/*`
6. Observasi & hipotesis AI

## Aturan paritas legacy (khusus revamp)

Untuk **perilaku yang terlihat user** (tampilan, alur, teks, data, URL), baseline legacy —
`analysis/000-legacy-inventory/*` dan snapshot baseline di `apps/web/e2e/` — menang atas asumsi
atau selera, **kecuali** ada BC yang disetujui di ADR-0012. Kode legacy di repo `indobraga/` adalah
bukti akhir bila inventaris dan baseline tidak cukup.

Kode menunjukkan apa yang **benar-benar terjadi**, bukan apa yang **seharusnya**. Bila (4) dan (5)
bertentangan, itu konflik untuk dilaporkan — bukan pilihan untuk diambil sendiri.
