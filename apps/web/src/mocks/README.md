# Mock API (MSW)

Mock stateful di `src/mocks/` — dipakai `npm run dev:mock` (`VITE_API_MOCK=true`)
dan seluruh test. Tidak masuk bundle produksi (diimpor dinamis dari `main.tsx`;
test build: `grep msw dist/` = 0).

- Seed: `src/mocks/seed/*.json` — hasil `npm run mocks:seed`
  (`scripts/fixtures/convert-legacy.mjs`) dari baseline PLAN-01
  (`src/mocks/fixtures/legacy-public|legacy-admin`, tidak diubah).
- DB in-memory (`db.ts`): CRUD, status, arsip, pagination offset & cursor,
  filter, search, sesi login/logout, CSRF double-submit, permission per role,
  rate limit (login 5/60 dtk, prospek publik 10/60 dtk), injeksi error
  4xx/5xx (`failNextRequest`, khusus test).
- Kredensial mock: email seed (`admin@example.test`, `editor@example.test`) plus
  alias prefill legacy `admin@indobraga.com`, kata sandi `indobraga123`.
- Cookie CSRF (`indobraga_csrf=mock-csrf-token`) dipasang otomatis saat worker
  start; cookie sesi httpOnly disimulasikan satu slot di memori (keterbatasan
  MSW yang didokumentasikan — perilaku header tetap sesuai kontrak).
- SSE `/admin/notifications/stream` mengembalikan stream teks; test mem-mock
  `EventSource` (didukung MSW 2 hanya sebagai respons statis).
- `onUnhandledRequest: "error"` — request di luar kontrak langsung merah.
