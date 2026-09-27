import type { ReactNode } from "react";

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "checkbox"
  | "media"
  | "media-multi"
  | "paragraphs"
  | "hidden";

export interface FieldOption {
  value: string | number;
  label: string;
}

export interface ResourceField {
  name: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  options?: FieldOption[];
  valueType?: "string" | "number";
  usage?: "hero" | "partner" | "portfolio" | "machine" | "gallery" | "news" | "og" | "other";
  max?: number;
}

export type FieldValue = unknown;
export type FormValues = Record<string, FieldValue>;

export interface ResourceColumn<T> {
  label: string;
  value: (item: T) => ReactNode;
}

/** Nama field preview untuk media tunggal (tidak dikirim ke API). */
export function mediaPreviewFieldName(fieldName: string): string {
  if (
    fieldName === "media_file_id" ||
    fieldName === "media_id" ||
    fieldName.endsWith("_media_file_id") ||
    fieldName.endsWith("_media_id")
  ) {
    return fieldName.slice(0, -3);
  }
  return `${fieldName}_preview`;
}

/** Nama field preview untuk media-multi (tidak dikirim ke API). */
export function mediaGalleryPreviewFieldName(field: string): string {
  if (field.endsWith("_ids")) return `${field.slice(0, -4)}s`;
  return `${field}_previews`;
}

export function asNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is number => typeof item === "number");
}

/**
 * Normalisasi payload form → body API (paritas legacy): key tak dikenal
 * dibuang (kecuali `status`); `""|undefined|null` dibuang; paragraphs →
 * array string; select numerik → Number bila finite.
 */
export function normalizePayload(
  values: FormValues,
  fields: ResourceField[],
): Record<string, unknown> {
  const fieldMap = new Map(fields.map((field) => [field.name, field]));
  return Object.entries(values).reduce<Record<string, unknown>>((payload, [key, value]) => {
    const field = fieldMap.get(key);
    if (!field && key !== "status") return payload;
    if (value === "" || value === undefined || value === null) return payload;
    if (field?.type === "paragraphs") {
      payload[key] = String(value)
        .split(/\n+/)
        .map((item) => item.trim())
        .filter(Boolean);
      return payload;
    }
    if (field?.type === "select" && field.valueType === "number") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) payload[key] = parsed;
      return payload;
    }
    payload[key] = value;
    return payload;
  }, {});
}
