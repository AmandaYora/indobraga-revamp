import { useState } from "react";
import { Image, Save, Type } from "lucide-react";
import { toast } from "sonner";
import { ErrorState, LoadingState } from "@/shared/components/feedback/states";
import { Field, TextArea, TextInput } from "@/modules/content";
import { MediaUploadField } from "@/modules/media";
import { PageTitle } from "@/shared/components/ui/page-title";
import { Card } from "@/shared/components/ui/card";
import { PrimaryButton } from "@/shared/components/ui/action-buttons";
import { useApiQuery } from "@/shared/hooks/useApiQuery";
import { getUserFacingErrorMessage } from "@/shared/services/api-error";
import { Seo, settingsService } from "@/modules/site";
import {
  emptySettingsForm,
  settingsFromApi,
  toSettingsUpdatePayload,
  type SettingsForm,
} from "@/modules/site/lib/settings-form";
import type { ContractSchemas } from "@/shared/types/contract";

type SiteSettings = ContractSchemas["SiteSettings"];

/** URL pratinjau media (bagian `SettingsForm` legacy yang tidak ikut dikirim ke API). */
type MediaPreviewUrls = {
  logo_url: string | null;
  footer_logo_url: string | null;
  og_image_url: string | null;
  contact_hero_image_url: string | null;
};

const EMPTY_PREVIEW_URLS: MediaPreviewUrls = {
  logo_url: null,
  footer_logo_url: null,
  og_image_url: null,
  contact_hero_image_url: null,
};

function previewUrlsFromApi(data: SiteSettings): MediaPreviewUrls {
  return {
    logo_url: typeof data.logo_url === "string" ? data.logo_url : null,
    footer_logo_url: typeof data.footer_logo_url === "string" ? data.footer_logo_url : null,
    og_image_url: typeof data.og_image_url === "string" ? data.og_image_url : null,
    contact_hero_image_url:
      typeof data.contact_hero_image_url === "string" ? data.contact_hero_image_url : null,
  };
}

/** Port 1:1 `routes/admin.settings.tsx` legacy. */
export default function SettingsPage() {
  const { data, error, loading, reload } = useApiQuery(["admin", "site-settings"], () =>
    settingsService.get(),
  );
  const [form, setForm] = useState<SettingsForm>(() => emptySettingsForm());
  const [previewUrls, setPreviewUrls] = useState<MediaPreviewUrls>(EMPTY_PREVIEW_URLS);
  const [syncedData, setSyncedData] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);

  // Legacy: form diisi ulang setiap kali data dari API berubah (termasuk setelah reload).
  if (data && data !== syncedData) {
    setSyncedData(data);
    setForm(settingsFromApi(data));
    setPreviewUrls(previewUrlsFromApi(data));
  }

  const text = (name: keyof SettingsForm) => String(form[name] ?? "");

  const update = (name: keyof SettingsForm, value: string | number | boolean | undefined) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const updatePreview = (name: keyof MediaPreviewUrls, value: string | null | undefined) => {
    setPreviewUrls((current) => ({ ...current, [name]: value ?? null }));
  };

  const save = async () => {
    setSaving(true);
    try {
      await settingsService.update(toSettingsUpdatePayload(form));
      toast.success("Pengaturan disimpan");
      reload();
    } catch (caught) {
      toast.error("Pengaturan gagal disimpan", {
        description: getUserFacingErrorMessage(caught, { action: "save" }),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Seo
        title="Pengaturan Website"
        description="Kelola identitas, kontak, dan SEO situs."
        path="/admin/settings"
        noindex
      />
      <PageTitle
        title="Pengaturan Website"
        desc="Atur identitas perusahaan, kontak, gambar halaman, dan tampilan saat dibagikan."
        action={
          <PrimaryButton onClick={() => void save()} disabled={saving || loading}>
            <Save className="h-4 w-4" /> {saving ? "Menyimpan..." : "Simpan"}
          </PrimaryButton>
        }
      />
      {loading && !data && <LoadingState label="Memuat pengaturan website..." />}
      {error && <ErrorState error={error} onRetry={reload} />}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-display text-lg font-bold text-primary-deep">
            Identitas Perusahaan
          </h3>
          <div className="space-y-4">
            <Field label="Nama Merek" required>
              <TextInput value={text("brand")} onChange={(e) => update("brand", e.target.value)} />
            </Field>
            <Field label="Nama Legal">
              <TextInput
                value={text("legal_name")}
                onChange={(e) => update("legal_name", e.target.value)}
              />
            </Field>
            <Field
              label="Tampilan Logo"
              hint="Pilih Logo Saja jika gambar logo sudah memuat nama merek."
            >
              <div
                role="radiogroup"
                aria-label="Tampilan logo"
                className="inline-grid w-full max-w-md grid-cols-2 rounded-lg border border-input bg-background p-1"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={form.show_brand_text}
                  onClick={() => update("show_brand_text", true)}
                  className={`inline-flex min-w-0 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
                    form.show_brand_text
                      ? "bg-primary text-primary-foreground shadow-card"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <Type className="h-4 w-4 shrink-0" />
                  <span className="truncate">Logo + Nama</span>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={!form.show_brand_text}
                  onClick={() => update("show_brand_text", false)}
                  className={`inline-flex min-w-0 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
                    !form.show_brand_text
                      ? "bg-primary text-primary-foreground shadow-card"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <Image className="h-4 w-4 shrink-0" />
                  <span className="truncate">Logo Saja</span>
                </button>
              </div>
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Email Resmi">
                <TextInput
                  type="email"
                  value={text("email")}
                  onChange={(e) => update("email", e.target.value)}
                />
              </Field>
              <Field label="Telepon">
                <TextInput
                  value={text("phone")}
                  onChange={(e) => update("phone", e.target.value)}
                />
              </Field>
              <Field label="Nomor WhatsApp" hint="Format internasional tanpa +.">
                <TextInput
                  value={text("whatsapp")}
                  onChange={(e) => update("whatsapp", e.target.value)}
                />
              </Field>
              <Field label="Instagram">
                <TextInput
                  value={text("instagram")}
                  onChange={(e) => update("instagram", e.target.value)}
                />
              </Field>
              <Field label="Narahubung">
                <TextInput
                  value={text("contact_person")}
                  onChange={(e) => update("contact_person", e.target.value)}
                />
              </Field>
              <Field label="Jabatan">
                <TextInput
                  value={text("contact_role")}
                  onChange={(e) => update("contact_role", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Alamat">
              <TextArea
                rows={2}
                value={text("address")}
                onChange={(e) => update("address", e.target.value)}
              />
            </Field>
          </div>
        </Card>
        <Card>
          <h3 className="mb-4 font-display text-lg font-bold text-primary-deep">
            Tampilan di Google & Media Sosial
          </h3>
          <div className="space-y-4">
            <Field label="Judul Google" hint="Disarankan maksimal 60 karakter.">
              <TextInput
                value={text("seo_title")}
                onChange={(e) => update("seo_title", e.target.value)}
              />
            </Field>
            <Field label="Deskripsi Google" hint="Disarankan maksimal 160 karakter.">
              <TextArea
                rows={3}
                value={text("seo_description")}
                onChange={(e) => update("seo_description", e.target.value)}
              />
            </Field>
          </div>
        </Card>
        <Card>
          <h3 className="mb-4 font-display text-lg font-bold text-primary-deep">Media Halaman</h3>
          <div className="space-y-4">
            <MediaUploadField
              label="Logo Navbar"
              hint="Tampil di header/navigasi atas."
              usage="other"
              value={form.logo_media_file_id}
              previewUrl={previewUrls.logo_url}
              onUploaded={(media) => {
                update("logo_media_file_id", media.id);
                updatePreview("logo_url", media.large_url ?? media.medium_url ?? media.file_url);
              }}
            />
            <MediaUploadField
              label="Logo Footer"
              hint="Khusus footer (latar gelap). Kosongkan untuk memakai Logo Navbar."
              usage="other"
              value={form.footer_logo_media_file_id}
              previewUrl={previewUrls.footer_logo_url}
              onUploaded={(media) => {
                update("footer_logo_media_file_id", media.id);
                updatePreview(
                  "footer_logo_url",
                  media.large_url ?? media.medium_url ?? media.file_url,
                );
              }}
            />
            <MediaUploadField
              label="Gambar Utama Kontak"
              usage="hero"
              value={form.contact_hero_media_file_id}
              previewUrl={previewUrls.contact_hero_image_url}
              onUploaded={(media) => {
                update("contact_hero_media_file_id", media.id);
                updatePreview(
                  "contact_hero_image_url",
                  media.large_url ?? media.medium_url ?? media.file_url,
                );
              }}
            />
            <MediaUploadField
              label="Gambar Saat Dibagikan"
              usage="og"
              value={form.og_media_file_id}
              previewUrl={previewUrls.og_image_url}
              onUploaded={(media) => {
                update("og_media_file_id", media.id);
                updatePreview("og_image_url", media.large_url ?? media.file_url);
              }}
            />
          </div>
        </Card>
      </div>
    </>
  );
}
