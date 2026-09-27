/**
 * Normalisasi nomor telepon Indonesia & URL WhatsApp (paritas `lib/lead-contact.ts` legacy).
 */

/** Normalisasi ke format internasional `62…`; `null` bila tidak valid (9–15 digit). */
export function normalizePhoneId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  let normalized: string;
  if (digits.startsWith("62")) normalized = digits;
  else if (digits.startsWith("0")) normalized = `62${digits.slice(1)}`;
  else if (digits.startsWith("8")) normalized = `62${digits}`;
  else return null;
  if (normalized.length < 9 || normalized.length > 15) return null;
  return normalized;
}

export function buildWhatsAppUrl(
  phone: string | null | undefined,
  message?: string,
): string | null {
  const normalized = normalizePhoneId(phone);
  if (!normalized) return null;
  const base = `https://wa.me/${normalized}`;
  const text = message?.trim();
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export function buildWhatsAppGreeting(name?: string | null): string {
  const safe = name?.trim() || "Kak";
  return (
    `Halo ${safe}, terima kasih telah menghubungi Indobraga. Perkenalkan, saya dari tim Indobraga. ` +
    `Ada yang bisa kami bantu terkait kebutuhan produksi Anda?`
  );
}

export function openWhatsAppLead(lead: { phone: string; name?: string | null }): boolean {
  const url = buildWhatsAppUrl(lead.phone, buildWhatsAppGreeting(lead.name));
  if (!url || typeof window === "undefined") return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}
