import { useState } from "react";
import type { FormEvent } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { httpClient, type ApiData } from "@/shared/services/http-client";
import { API } from "@/shared/services/api-endpoints";
import { getUserFacingErrorMessage } from "@/shared/services/api-error";
import { useSiteSettingsStore } from "@/modules/site/stores/site-settings.store";
import { fallbackSettings } from "@/modules/site/lib/fallbacks";
import type { ContractSchemas } from "@/shared/types/contract";

type WhatsAppLeadResult = ContractSchemas["CreateWhatsAppLeadResult"];

/**
 * Port 1:1 `components/public/WhatsAppFAB.tsx` legacy: modal nama + telepon →
 * `POST /public/whatsapp-leads` → `window.open(whatsapp_url)`; bila API gagal tetap membuka
 * `wa.me/{whatsapp perusahaan}` + toast.
 */
export function WhatsAppFab() {
  const settings = useSiteSettingsStore((state) => state.settings);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    const message = `Halo Indobraga, saya ${name}. Nomor saya ${phone}. Saya ingin berdiskusi lebih lanjut mengenai kebutuhan produksi garment.`;
    setSent(true);

    try {
      const response = await httpClient.post<ApiData<WhatsAppLeadResult>>(
        API.public.whatsappLeads,
        { name, phone, message },
      );
      const lead = (response.data as ApiData<WhatsAppLeadResult>).data;
      window.open(lead.whatsapp_url, "_blank");
      setOpen(false);
      setName("");
      setPhone("");
    } catch (error) {
      const text = encodeURIComponent(message);
      const companyNumber = settings.whatsapp || fallbackSettings.whatsapp;
      window.open(`https://wa.me/${companyNumber}?text=${text}`, "_blank");
      toast.error("WhatsApp tetap dibuka", {
        description: getUserFacingErrorMessage(error, { action: "send", audience: "public" }),
      });
    } finally {
      setSent(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-elegant transition-transform hover:scale-110"
        aria-label="Hubungi via WhatsApp"
      >
        <img
          src="/whatsapp.png"
          alt=""
          aria-hidden="true"
          className="h-full w-full rounded-full object-contain"
        />
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-accent" />
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-primary-deep/40 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-elegant animate-fade-up">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-primary-deep">Chat via WhatsApp</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tinggalkan kontak Anda, tim kami siap membantu.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Tutup form WhatsApp"
                title="Tutup"
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={submit} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="whatsapp-lead-name"
                  className="text-xs font-semibold text-foreground"
                >
                  Nama Lengkap
                </label>
                <input
                  id="whatsapp-lead-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="Nama Anda"
                />
              </div>
              <div>
                <label
                  htmlFor="whatsapp-lead-phone"
                  className="text-xs font-semibold text-foreground"
                >
                  Nomor Telepon
                </label>
                <input
                  id="whatsapp-lead-phone"
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="08xxxxxxxxxx"
                />
              </div>
              <button
                type="submit"
                disabled={sent}
                className="w-full rounded-lg bg-[oklch(0.55_0.18_150)] py-2.5 text-sm font-semibold text-white transition hover:bg-[oklch(0.5_0.18_150)] disabled:opacity-60"
              >
                {sent ? "Mengarahkan ke WhatsApp..." : "Lanjutkan ke WhatsApp"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
