# ADR-0004: Kontrak API v1 & envelope respons

## Status
Accepted — 2026-09-26

## Context
Frontend dan backend legacy sama-sama ditulis ulang (PLAN-02, PLAN-03), dengan urutan frontend
lebih dulu. Keduanya butuh satu antarmuka yang pasti agar bisa dikembangkan dan diuji terpisah lalu
terintegrasi tanpa kejutan (PLAN-04). Envelope legacy
(`{success, data, meta:{request_id,timestamp}}` / `{success:false, error:{code,message,details}}`,
list `data:{items,pagination}`) berbeda dari standar monorepo
(`{success, message, data}` / `{success:false, message, errors}`), dan UI legacy bergantung pada
kode error mesin (mis. redirect saat `UNAUTHENTICATED`).

## Decision
1. **Kontrak dulu.** `packages/api-contract/openapi.yaml` (OpenAPI 3.1, dirakit dari fragmen
   per modul) adalah sumber kebenaran. Perubahan antarmuka = PR kontrak lebih dulu → regenerate tipe
   (`generated/schema.d.ts`) → kode web & api.
2. **Envelope standar + ekstensi minimal:**
   - Sukses: `{ success: true, message, data }`.
   - List offset: `data: [...]`, `meta: { page, limit, total, total_pages }`.
   - List cursor: `data: [...]`, `meta: { limit, next_cursor, has_more }`.
   - Error: `{ success: false, code, message, errors: [{ field, message }], request_id }` —
     `code` dan `request_id` adalah ekstensi atas standar.
   - Header `X-Request-Id` di setiap respons.
3. **Path legacy dipertahankan** (termasuk callback OAuth Google, `robots.txt`, `sitemap.xml`),
   kecuali route generik lintas modul `/admin/{resource}/{id}/(un)archive` yang dipecah menjadi path
   eksplisit per resource (setiap modul Go mendaftarkan route-nya sendiri; menutup BC-05).
4. **Error code**: 13 kode inti legacy + kode domain (BC-04), dikelola di
   `components/schemas/envelope.yaml#/ErrorCode`. Pesan default bahasa Indonesia per kode; pesan
   domain dipertahankan.
5. **Ekstensi wajib per operasi**: `x-module`, `x-permission`, `x-rate-limit`, `x-cache-control`,
   `x-legacy` — dicek Redocly lint dan `scripts/check-mapping.mjs`.
6. **Cakupan terbukti**: 160 endpoint legacy (`legacy/legacy-endpoints.json`, hasil pindai controller
   legacy) wajib terpetakan; `LEGACY_MAPPING.md` di-generate dari kontrak.

## Alternatives rejected
- *Mempertahankan envelope legacy apa adanya*: tidak ada beban kompatibilitas karena kedua sisi
  ditulis ulang; melanggar standar tanpa alasan.
- *Envelope standar murni tanpa `code`*: UI membutuhkan kode mesin; mencocokkan teks pesan rapuh.
- *Kontrak ditulis setelah backend*: frontend yang dikerjakan lebih dulu akan menebak bentuk data.

## Consequences
- Frontend memakai tipe hasil generate dan mock MSW yang divalidasi terhadap kontrak (PLAN-02 §2.3).
- Backend memvalidasi setiap respons HTTP test terhadap kontrak (PLAN-03 §3.12).
- CI gagal bila kontrak tidak lint-bersih, mapping legacy tidak lengkap, atau tipe/bundle basi.
