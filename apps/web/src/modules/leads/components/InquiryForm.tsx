import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { httpClient } from "@/shared/services/http-client";
import { API } from "@/shared/services/api-endpoints";
import { ApiError, getUserFacingErrorMessage } from "@/shared/services/api-error";
import { inquirySchema } from "@/modules/leads";
import { Button } from "@/shared/components/ui/button";

const SUCCESS_BANNER_MS = 4000;

/** Form inquiry: validasi, honeypot `website`, banner sukses 4 dtk, toast error. */
export function InquiryForm() {
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const bannerTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (bannerTimer.current !== null) window.clearTimeout(bannerTimer.current);
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const values = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      company: String(formData.get("company") ?? ""),
      message: String(formData.get("message") ?? ""),
      website: String(formData.get("website") ?? ""),
    };
    // Honeypot: bot ter-drop diam-diam (paritas legacy).
    if (values.website.trim() !== "") return;

    const parsed = inquirySchema.safeParse(values);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        errors[key] ??= issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setSending(true);
    try {
      const payload = parsed.data;
      await httpClient.post(API.public.inquiries, {
        name: payload.name.trim(),
        email: payload.email.trim(),
        phone: payload.phone.trim(),
        ...(payload.company?.trim() ? { company: payload.company.trim() } : {}),
        message: payload.message.trim(),
      });
      formRef.current?.reset();
      setSuccess(true);
      if (bannerTimer.current !== null) window.clearTimeout(bannerTimer.current);
      bannerTimer.current = window.setTimeout(() => setSuccess(false), SUCCESS_BANNER_MS);
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.code === "VALIDATION_ERROR" &&
        error.errors.length > 0
      ) {
        const errors: Record<string, string> = {};
        for (const detail of error.errors) {
          if (detail.field)
            errors[detail.field.split(".").pop() ?? detail.field] ??= detail.message;
        }
        setFieldErrors(errors);
      }
      toast.error("Pesan gagal dikirim", {
        description:
          error instanceof ApiError
            ? getUserFacingErrorMessage(error, { audience: "public" })
            : undefined,
      });
    } finally {
      setSending(false);
    }
  }

  function fieldError(name: string) {
    return fieldErrors[name] ? (
      <p role="alert" className="mt-1 text-xs text-destructive">
        {fieldErrors[name]}
      </p>
    ) : null;
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      className="space-y-4"
      aria-label="Formulir kirim pesan"
    >
      {success ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl bg-success/10 px-4 py-3 text-sm font-medium text-success-strong"
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Pesan berhasil dikirim.
        </p>
      ) : null}
      <div>
        <label htmlFor="inquiry-name" className="mb-1 block text-sm font-medium">
          Nama
        </label>
        <input
          id="inquiry-name"
          name="name"
          type="text"
          autoComplete="name"
          placeholder="Nama Anda"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
        />
        {fieldError("name")}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="inquiry-email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <input
            id="inquiry-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="nama@email.com"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
          {fieldError("email")}
        </div>
        <div>
          <label htmlFor="inquiry-phone" className="mb-1 block text-sm font-medium">
            Nomor Telepon
          </label>
          <input
            id="inquiry-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="08xxxxxxxxxx"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
          {fieldError("phone")}
        </div>
      </div>
      <div>
        <label htmlFor="inquiry-company" className="mb-1 block text-sm font-medium">
          Perusahaan <span className="font-normal text-muted-foreground">(Opsional)</span>
        </label>
        <input
          id="inquiry-company"
          name="company"
          type="text"
          autoComplete="organization"
          placeholder="Opsional"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
        />
        {fieldError("company")}
      </div>
      <div>
        <label htmlFor="inquiry-message" className="mb-1 block text-sm font-medium">
          Pesan
        </label>
        <textarea
          id="inquiry-message"
          name="message"
          rows={5}
          placeholder="Ceritakan kebutuhan produksi Anda"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
        />
        {fieldError("message")}
      </div>
      {/* Honeypot anti-bot — tersembunyi dari user & screen reader. */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label>
          Website
          <input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <Button type="submit" className="w-full sm:w-auto" disabled={sending}>
        {sending ? "Mengirim..." : "Kirim Pesan"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Respon akan diarahkan ke tim marketing Indobraga.
      </p>
    </form>
  );
}
