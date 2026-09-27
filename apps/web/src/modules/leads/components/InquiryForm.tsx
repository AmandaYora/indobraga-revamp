import { useState } from "react";
import type { FormEvent, InputHTMLAttributes } from "react";
import { AtSign, CheckCircle2, Send } from "lucide-react";
import { toast } from "sonner";
import { httpClient } from "@/shared/services/http-client";
import { API } from "@/shared/services/api-endpoints";
import { getUserFacingErrorMessage } from "@/shared/services/api-error";
import type { ContractSchemas } from "@/shared/types/contract";

type CreateInquiryInput = ContractSchemas["CreateInquiryInput"];

const SUCCESS_BANNER_MS = 4000;

/**
 * Port 1:1 form "Kirim Pesan" di `routes/_public.kontak.tsx` legacy: validasi native browser
 * (`required`, `type=email`), validasi panjang/format di server (error → toast), honeypot
 * `website` ikut dikirim (server mengabaikan diam-diam dan tetap sukses), banner sukses 4 dtk.
 */
export function InquiryForm() {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setSending(true);

    try {
      const payload: CreateInquiryInput = {
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        company: String(formData.get("company") ?? ""),
        message: String(formData.get("message") ?? ""),
        website: String(formData.get("website") ?? ""),
      };
      await httpClient.post(API.public.inquiries, payload);
      setSent(true);
      setTimeout(() => setSent(false), SUCCESS_BANNER_MS);
      form.reset();
    } catch (error) {
      toast.error("Pesan gagal dikirim", {
        description: getUserFacingErrorMessage(error, { action: "send", audience: "public" }),
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-3xl bg-card p-8 shadow-elegant">
      {sent && (
        <div className="mb-5 flex items-center gap-2 rounded-xl bg-success/10 px-4 py-3 text-sm font-medium text-success">
          <CheckCircle2 className="h-4 w-4" /> Pesan berhasil dikirim.
        </div>
      )}
      <h2 className="font-display text-2xl font-bold text-primary-deep">Kirim Pesan</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Isi form di bawah, kami akan segera menghubungi Anda.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Nama" name="name" required />
        <Field label="Email" name="email" type="email" required />
        <Field label="Nomor Telepon" name="phone" type="tel" required />
        <Field label="Perusahaan" name="company" placeholder="Opsional" />
      </div>
      <div className="mt-4">
        <label htmlFor="inquiry-message" className="text-xs font-semibold">
          Pesan
        </label>
        <textarea
          id="inquiry-message"
          required
          rows={5}
          name="message"
          className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>
      {/* Honeypot: tersembunyi dari user; hanya bot yang mengisi dan di-drop diam-diam oleh server. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-9999px",
          width: 1,
          height: 1,
          overflow: "hidden",
        }}
      >
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <button
        type="submit"
        disabled={sending}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-accent py-3.5 text-sm font-bold text-accent-foreground shadow-card"
      >
        <Send className="h-4 w-4" /> {sending ? "Mengirim..." : "Kirim Pesan"}
      </button>
      <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <AtSign className="h-3.5 w-3.5" /> Respon akan diarahkan ke tim marketing Indobraga.
      </p>
    </form>
  );
}

function Field({
  label,
  name,
  ...rest
}: { label: string; name: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = `inquiry-${name}`;
  return (
    <div>
      <label htmlFor={id} className="text-xs font-semibold">
        {label}
      </label>
      <input
        {...rest}
        id={id}
        name={name}
        className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}
