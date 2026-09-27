import type { ContractSchemas } from "@/shared/types/contract";

export type SettingsForm = Record<string, string | boolean | number | undefined> & {
  show_brand_text: boolean;
  logo_media_file_id?: number;
  footer_logo_media_file_id?: number;
  og_media_file_id?: number;
  contact_hero_media_file_id?: number;
};

const TEXT_FIELDS = [
  "brand",
  "legal_name",
  "email",
  "phone",
  "whatsapp",
  "instagram",
  "contact_person",
  "contact_role",
  "address",
  "seo_title",
  "seo_description",
] as const;

export function emptySettingsForm(): SettingsForm {
  return {
    brand: "",
    legal_name: "",
    email: "",
    phone: "",
    whatsapp: "",
    instagram: "",
    contact_person: "",
    contact_role: "",
    address: "",
    seo_title: "",
    seo_description: "",
    show_brand_text: false,
  };
}

export function settingsFromApi(settings: ContractSchemas["SiteSettings"]): SettingsForm {
  const form = emptySettingsForm();
  for (const field of TEXT_FIELDS) {
    const value: unknown = (settings as unknown as Record<string, unknown>)[field];
    form[field] = typeof value === "string" ? value : "";
  }
  form.show_brand_text = settings.show_brand_text === true;
  if (typeof settings.logo_media_file_id === "number")
    form.logo_media_file_id = settings.logo_media_file_id;
  if (typeof settings.footer_logo_media_file_id === "number") {
    form.footer_logo_media_file_id = settings.footer_logo_media_file_id;
  }
  if (typeof settings.og_media_file_id === "number")
    form.og_media_file_id = settings.og_media_file_id;
  if (typeof settings.contact_hero_media_file_id === "number") {
    form.contact_hero_media_file_id = settings.contact_hero_media_file_id;
  }
  return form;
}

/** Hanya id media bertipe number yang dikirim (paritas `-admin.settings.helpers`). */
export function toSettingsUpdatePayload(form: SettingsForm): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const field of TEXT_FIELDS) {
    payload[field] = form[field] ?? "";
  }
  payload.show_brand_text = form.show_brand_text;
  if (typeof form.logo_media_file_id === "number")
    payload.logo_media_file_id = form.logo_media_file_id;
  if (typeof form.footer_logo_media_file_id === "number") {
    payload.footer_logo_media_file_id = form.footer_logo_media_file_id;
  }
  if (typeof form.og_media_file_id === "number") payload.og_media_file_id = form.og_media_file_id;
  if (typeof form.contact_hero_media_file_id === "number") {
    payload.contact_hero_media_file_id = form.contact_hero_media_file_id;
  }
  return payload;
}
