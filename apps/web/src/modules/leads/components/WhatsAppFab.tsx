import { useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { httpClient, type ApiData } from "@/shared/services/http-client";
import { API } from "@/shared/services/api-endpoints";
import { ApiError, getUserFacingErrorMessage } from "@/shared/services/api-error";
import { buildWhatsAppUrl } from "@/modules/leads/lib/lead-contact";
import { useSiteSettingsStore } from "@/modules/site";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

interface WhatsAppLeadResult {
  whatsapp_url: string;
}

/**
 * Tombol mengambang WhatsApp: modal nama + telepon → `POST /public/whatsapp-leads`
 * → `window.open(whatsapp_url)`; fallback `wa.me/{whatsapp}` saat API gagal.
 */
export function WhatsAppFab() {
  const settings = useSiteSettingsStore((state) => state.settings);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    if (!trimmedName || !trimmedPhone) return;
    setSending(true);
    const message =
      `Halo Indobraga, saya ${trimmedName}. Nomor saya ${trimmedPhone}. ` +
      `Saya ingin berdiskusi lebih lanjut mengenai kebutuhan produksi garment.`;
    try {
      const response = await httpClient.post<ApiData<WhatsAppLeadResult>>(
        API.public.whatsappLeads,
        { name: trimmedName, phone: trimmedPhone, message },
      );
      window.open(
        (response.data as ApiData<WhatsAppLeadResult>).data.whatsapp_url,
        "_blank",
        "noopener,noreferrer",
      );
      setOpen(false);
    } catch (error) {
      const fallback = buildWhatsAppUrl(settings.whatsapp ?? trimmedPhone, message);
      if (fallback) {
        window.open(fallback, "_blank", "noopener,noreferrer");
        toast.error("WhatsApp tetap dibuka", {
          description:
            error instanceof ApiError
              ? getUserFacingErrorMessage(error, { audience: "public" })
              : undefined,
        });
        setOpen(false);
      } else {
        toast.error("Pesan gagal dikirim", {
          description:
            error instanceof ApiError
              ? getUserFacingErrorMessage(error, { audience: "public" })
              : undefined,
        });
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Chat via WhatsApp"
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-elegant transition-transform hover:scale-105"
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 animate-ping rounded-full bg-accent opacity-40"
        />
        <img src="/whatsapp.png" alt="" className="relative h-14 w-14 rounded-full" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md animate-fade-up">
          <DialogHeader>
            <DialogTitle>Chat via WhatsApp</DialogTitle>
            <DialogDescription>Tinggalkan kontak Anda, tim kami siap membantu.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="wa-name" className="mb-1 block text-sm font-medium">
                Nama Lengkap
              </label>
              <input
                id="wa-name"
                name="name"
                type="text"
                required
                placeholder="Nama Anda"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="wa-phone" className="mb-1 block text-sm font-medium">
                Nomor Telepon
              </label>
              <input
                id="wa-phone"
                name="phone"
                type="tel"
                required
                placeholder="08xxxxxxxxxx"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <Button type="submit" className="w-full" disabled={sending}>
              {sending ? "Mengarahkan ke WhatsApp..." : "Lanjutkan ke WhatsApp"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
