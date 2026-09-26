# ADR-0010: Sumber kebenaran desain

## Status
Accepted — 2026-09-26

## Context
Dimas tidak ingin ada desain yang hilang. Standar monorepo menjadikan skill `frontend-design`
otoritas UI untuk `apps/web`. Legacy memakai Tailwind 4 dengan token oklch, Radix + pola shadcn
(new-york), font Inter & Plus Jakarta Sans, ikon lucide.

## Decision
- **UI legacy adalah spesifikasi visual.** Baseline screenshot (PLAN-01 §1.7) adalah acuan; paritas
  diukur dengan visual regression otomatis (PLAN-02 §2.9).
- Token warna, radius, shadow, gradient, animasi, dan utility custom dipindah **dengan nilai identik**
  ke `src/theme/theme.css` + `src/styles/globals.css`; warna yang di-hardcode legacy dijadikan token
  bernilai sama.
- Radix + pola shadcn tetap dipakai di `shared/components/ui` (tidak termasuk daftar
  anti-overengineering standar). `lucide-react` dengan major/minor yang sama agar ikon identik.
- Font di-self-host dengan file variable yang sama (BC-28).
- Skill `frontend-design` dipakai untuk **state yang belum ada di legacy** (halaman 404, empty/error
  state baru) dan review konsistensi — bukan untuk restyle halaman yang sudah ada.

## Consequences
- Perbedaan visual hanya boleh karena BC yang tercatat, didokumentasikan di
  `apps/web/e2e/VISUAL_DIFFS.md`.
- Snapshot baseline legacy tidak boleh di-update dengan `--update-snapshots`.
