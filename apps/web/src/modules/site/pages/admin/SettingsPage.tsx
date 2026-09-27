import { useState } from "react";
import { toast } from "sonner";
import { useApiQuery } from "@/shared/hooks/useApiQuery";
import { settingsService } from "@/modules/site";
import {
  emptySettingsForm,
  settingsFromApi,
  toSettingsUpdatePayload,
  type SettingsForm,
} from "@/modules/site/lib/settings-form";
import { MediaUploadField } from "@/modules/media";
import { mediaPreviewUrl } from "@/modules/media";
import { PageTitle } from "@/shared/components/ui/page-title";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Seo } from "@/modules/site";
import { ApiError } from "@/shared/services/api-error";
import { ErrorState, LoadingState } from "@/shared/components/feedback/states";
import type { ContractSchemas } from "@/shared/types/contract";

type MediaItem = ContractSchemas["MediaItem"];

const TEXT_INPUTS: {
  name: keyof SettingsForm;
  label: string;
  hint?: string;
  textarea?: boolean;
}[] = [
  { name: "brand", label: "Nama brand" },
  { name: "legal_name", label: "Nama legal" },
  { name: "email", label: "Email" },
  { name: "phone", label: "Telepon" },
  { name: "whatsapp", label: "WhatsApp", hint: "Format internasional tanpa +, mis. 62851xxxxxxx." },
  { name: "instagram", label: "Instagram", hint: "Username tanpa @." },
  { name: "contact_person", label: "Narahubung" },
  { name: "contact_role", label: "Peran narahubung" },
  { name: "address", label: "Alamat", textarea: true },
  {
    name: "seo_title",
    label: "Judul SEO situs",
    hint: "Maks. 60 karakter — default judul seluruh situs (BC-21).",
  },
  {
    name: "seo_description",
    label: "Deskripsi SEO situs",
    hint: "Maks. 160 karakter — default deskripsi seluruh situs (BC-21).",
    textarea: true,
  },
];

const MEDIA_INPUTS: {
  key:
    | "logo_media_file_id"
    | "footer_logo_media_file_id"
    | "contact_hero_media_file_id"
    | "og_media_file_id";
  label: string;
  usage: "other" | "hero" | "og";
}[] = [
  { key: "logo_media_file_id", label: "Logo navbar", usage: "other" },
  { key: "footer_logo_media_file_id", label: "Logo footer", usage: "other" },
  { key: "contact_hero_media_file_id", label: "Gambar hero kontak", usage: "hero" },
  { key: "og_media_file_id", label: "Gambar OG default", usage: "og" },
];

/**
 * FE-ST01: identitas/kontak, radio tampilan logo, SEO title/description,
 * 4 upload media (logo navbar, logo footer, hero kontak, OG).
 */
export default function SettingsPage() {
  const { data, error, loading, reload } = useApiQuery(["admin", "site-settings"], () =>
    settingsService.get(),
  );
  const [form, setForm] = useState<SettingsForm | null>(null);
  const [previews, setPreviews] = useState<Record<string, MediaItem | null>>({});
  const [saving, setSaving] = useState(false);

  const current: SettingsForm = form ?? (data ? settingsFromApi(data) : emptySettingsForm());
  const textValue = (name: string): string => String(current[name] ?? "");

  function setField(name: keyof SettingsForm, value: string | boolean | number) {
    setForm((currentForm) => ({
      ...(currentForm ?? (data ? settingsFromApi(data) : emptySettingsForm())),
      [name]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (textValue("brand").trim() === "") {
      toast.error("Nama brand wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      await settingsService.update(toSettingsUpdatePayload(current));
      toast.success("Pengaturan disimpan");
      reload();
    } catch (saveError) {
      toast.error("Simpan gagal", {
        description: saveError instanceof ApiError ? saveError.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading && !data) return <LoadingState label="Memuat pengaturan..." />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;

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
        desc="Identitas, kontak, tampilan logo, SEO default, dan media situs."
        action={
          <Button type="submit" form="settings-form" disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        }
      />
      <form id="settings-form" onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
        <Card>
          <h2 className="font-semibold">Identitas &amp; Kontak</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {TEXT_INPUTS.map((input) => (
              <div
                key={String(input.name)}
                className={input.textarea ? "sm:col-span-2" : undefined}
              >
                <label
                  htmlFor={`settings-${String(input.name)}`}
                  className="mb-1 block text-sm font-medium"
                >
                  {input.label}
                </label>
                {input.textarea ? (
                  <textarea
                    id={`settings-${String(input.name)}`}
                    rows={3}
                    value={textValue(String(input.name))}
                    onChange={(event) => setField(input.name, event.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                ) : (
                  <input
                    id={`settings-${String(input.name)}`}
                    type="text"
                    value={textValue(String(input.name))}
                    onChange={(event) => setField(input.name, event.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                )}
                {input.hint ? (
                  <p className="mt-1 text-xs text-muted-foreground">{input.hint}</p>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="font-semibold">Tampilan Logo</h2>
          <div className="mt-3 space-y-2" role="radiogroup" aria-label="Tampilan logo">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="show_brand_text"
                checked={current.show_brand_text === true}
                onChange={() => setField("show_brand_text", true)}
              />
              Logo + Nama
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="show_brand_text"
                checked={current.show_brand_text === false}
                onChange={() => setField("show_brand_text", false)}
              />
              Logo Saja
            </label>
          </div>
        </Card>
        <Card>
          <h2 className="font-semibold">Media Situs</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {MEDIA_INPUTS.map((input) => (
              <MediaUploadField
                key={input.key}
                label={input.label}
                usage={input.usage}
                value={
                  typeof current[input.key] === "number" ? (current[input.key] as number) : null
                }
                previewUrl={previews[input.key] ? mediaPreviewUrl(previews[input.key]) : null}
                onUploaded={(media) => {
                  setPreviews((currentPreviews) => ({ ...currentPreviews, [input.key]: media }));
                  setField(input.key, media.id);
                }}
              />
            ))}
          </div>
        </Card>
        <div>
          <Button type="submit" disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan Pengaturan"}
          </Button>
        </div>
      </form>
    </>
  );
}
