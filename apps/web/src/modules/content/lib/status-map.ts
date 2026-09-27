import type { BadgeTone } from "@/shared/components/ui/badge";

/**
 * Peta status domain → label + tone `Badge` generik. Shared UI tidak mengenal status domain
 * (aturan standar); setiap domain memakai peta di sini.
 *
 * Nilai label & tone = port 1:1 peta `StatusBadge` legacy (`components/admin/ui.tsx`), termasuk
 * fallback "Status belum dikenal" (tone muted). Tone ↔ kelas legacy:
 * primary `bg-primary/10 text-primary` · warning `bg-warning/15 text-[oklch(0.45_0.15_75)]` ·
 * accent `bg-accent/20 text-accent-foreground` · success `bg-success/15 text-success` ·
 * destructive `bg-destructive/10 text-destructive` · muted `bg-muted text-muted-foreground`.
 */
export interface StatusDisplay {
  label: string;
  tone: BadgeTone;
}

type StatusMap = Record<string, StatusDisplay>;

export const UNKNOWN_STATUS: StatusDisplay = { label: "Status belum dikenal", tone: "muted" };

function resolve(map: StatusMap, status: string | null | undefined): StatusDisplay {
  if (!status || !Object.hasOwn(map, status)) return UNKNOWN_STATUS;
  return map[status];
}

/** Konten admin (`ContentStatus`). */
const CONTENT_STATUS: StatusMap = {
  published: { label: "Tayang", tone: "success" },
  draft: { label: "Draf", tone: "muted" },
  archived: { label: "Diarsipkan", tone: "muted" },
  inactive: { label: "Tidak Aktif", tone: "muted" },
};

/** Pesan kontak & prospek WhatsApp (`LeadStatus`). */
const LEAD_STATUS: StatusMap = {
  new: { label: "Baru", tone: "primary" },
  contacted: { label: "Sudah Dihubungi", tone: "warning" },
  in_progress: { label: "Dalam Proses", tone: "accent" },
  closed: { label: "Selesai", tone: "success" },
  spam: { label: "Spam", tone: "destructive" },
};

/** Akun pengirim email (`EmailAccountStatus` + nilai lama legacy). */
const EMAIL_ACCOUNT_STATUS: StatusMap = {
  connected: { label: "Terhubung", tone: "success" },
  expired: { label: "Perlu Hubungkan Ulang", tone: "destructive" },
  revoked: { label: "Akses Dicabut", tone: "destructive" },
  disabled: { label: "Nonaktif", tone: "muted" },
  invalid: { label: "Tidak Valid", tone: "destructive" },
  needs_reconnect: { label: "Perlu Hubungkan Ulang", tone: "warning" },
};

/** Kampanye email (`CampaignStatus`; `sending`/`sent` = nilai lama legacy, BC-13). */
const CAMPAIGN_STATUS: StatusMap = {
  draft: { label: "Draf", tone: "muted" },
  pending: { label: "Menunggu", tone: "warning" },
  sending: { label: "Mengirim", tone: "primary" },
  sent: { label: "Terkirim", tone: "success" },
  completed: { label: "Selesai", tone: "success" },
  failed: { label: "Gagal", tone: "destructive" },
  cancelled: { label: "Dibatalkan", tone: "muted" },
  processing: { label: "Diproses", tone: "primary" },
};

/** Penerima & log pengiriman email (`RecipientStatus`, `CampaignLog.status`). */
const EMAIL_DELIVERY_STATUS: StatusMap = {
  pending: { label: "Menunggu", tone: "warning" },
  sending: { label: "Mengirim", tone: "primary" },
  sent: { label: "Terkirim", tone: "success" },
  completed: { label: "Selesai", tone: "success" },
  failed: { label: "Gagal", tone: "destructive" },
  cancelled: { label: "Dibatalkan", tone: "muted" },
  skipped: { label: "Dilewati", tone: "muted" },
  queued: { label: "Antre", tone: "warning" },
  temporary_failed: { label: "Gagal Sementara", tone: "warning" },
  delivered: { label: "Terkirim", tone: "success" },
  processing: { label: "Diproses", tone: "primary" },
};

/** Media (`MediaStatus` = `compression_status`). */
const MEDIA_STATUS: StatusMap = {
  pending: { label: "Menunggu", tone: "warning" },
  completed: { label: "Selesai", tone: "success" },
  failed: { label: "Gagal", tone: "destructive" },
  archived: { label: "Diarsipkan", tone: "muted" },
  processing: { label: "Diproses", tone: "primary" },
  pending_delete: { label: "Menunggu Dihapus", tone: "warning" },
  cleanup_failed: { label: "Perlu Dibersihkan", tone: "destructive" },
  deleted: { label: "Dihapus", tone: "muted" },
};

/** Pengguna admin. */
const USER_STATUS: StatusMap = {
  active: { label: "Aktif", tone: "success" },
  inactive: { label: "Tidak Aktif", tone: "muted" },
};

export const contentStatus = (status: string | null | undefined) => resolve(CONTENT_STATUS, status);
export const leadStatus = (status: string | null | undefined) => resolve(LEAD_STATUS, status);
export const emailAccountStatus = (status: string | null | undefined) =>
  resolve(EMAIL_ACCOUNT_STATUS, status);
export const campaignStatus = (status: string | null | undefined) =>
  resolve(CAMPAIGN_STATUS, status);
export const emailDeliveryStatus = (status: string | null | undefined) =>
  resolve(EMAIL_DELIVERY_STATUS, status);
export const mediaStatus = (status: string | null | undefined) => resolve(MEDIA_STATUS, status);
export const userStatus = (status: string | null | undefined) => resolve(USER_STATUS, status);

/** Tone saja (kompatibilitas pemanggil lama); label + tone lengkap lewat fungsi di atas. */
export const contentStatusTone = (status: string | null | undefined) => contentStatus(status).tone;
export const inquiryStatusTone = (status: string | null | undefined) => leadStatus(status).tone;
export const accountStatusTone = (status: string | null | undefined) =>
  emailAccountStatus(status).tone;
export const campaignStatusTone = (status: string | null | undefined) =>
  campaignStatus(status).tone;
export const mediaStatusTone = (status: string | null | undefined) => mediaStatus(status).tone;
