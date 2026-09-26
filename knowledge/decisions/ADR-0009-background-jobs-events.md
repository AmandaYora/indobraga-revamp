# ADR-0009: Background job & event in-process

## Status
Accepted — 2026-09-26

## Context
Legacy menjalankan worker kampanye email via `setInterval` + pemicu event, worker email notifikasi
hanya lewat endpoint tick eksternal (tidak terjadwal), SSE dengan registry in-memory, dan
"revalidation" berupa tabel event tanpa efek. Standar melarang Redis/queue/mikroservis secara default.

## Decision
- **Scheduler in-process** (`shared/scheduler`): job ber-ticker, single-flight + re-arm, berhenti via
  context saat shutdown. Job: worker kampanye (`EMAIL_WORKER_POLL_MS`), worker email notifikasi
  (`NOTIFICATION_WORKER_POLL_MS`, BC-02), janitor sesi & OAuth state (BC-08).
- **Klaim berbasis DB** (UPDATE bersyarat + `locked_at` + pemulihan lock basi) sehingga aman bila suatu
  saat berjalan lebih dari satu instans.
- **Event bus in-process** (`shared/events`), bertipe, dipublikasikan **setelah commit**, untuk side
  effect lintas modul: `inquiry.created`, `whatsapp_lead.created`, `notification_email.finished`,
  `user.deactivated`, `user.password_changed`, `content.changed`. Error handler dicatat, tidak
  menggagalkan request (paritas).
- **Cache publik in-process** di modul `site`, diinvalidasi `content.changed` + TTL pengaman 60 dtk,
  menggantikan revalidation legacy (BC-12).
- **SSE hub in-memory** (instans tunggal), heartbeat 30 dtk.
- Endpoint tick internal tetap ada untuk operasi manual (secret, compare constant-time).
- Outbox **tidak** dipakai sekarang; dipertimbangkan hanya bila kehilangan side effect terbukti
  berdampak bisnis.

## Consequences
- Satu proses = satu container; rate limiter, SSE, dan cache bersifat per instans (sesuai topologi
  ADR-0013).
- Graceful shutdown wajib menunggu kiriman email yang sedang berjalan dan melepas lock.
