/**
 * Konverter fixture legacy → seed MSW v1 (PLAN-02 §2.3, F1).
 *
 * Membaca `src/mocks/fixtures/legacy-public` & `src/mocks/fixtures/legacy-admin`
 * (baseline PLAN-01, tidak diubah) dan menulis salinan ternormalisasi ke
 * `src/mocks/seed/`:
 * - `data: { items, pagination }` → `data: [...]` + `meta: { page, limit, total, total_pages }`
 * - status enum di-lowercase; `name` → `title` untuk objek kampanye
 * - `_status` & `meta.request_id/timestamp` basi dibuang (MSW menghitung sendiri)
 *
 * Idempoten & deterministik: output diurutkan, tanpa timestamp berjalan.
 */
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "src", "mocks");
const fixturesDir = join(root, "fixtures");
const seedDir = join(root, "seed");

const STATUS_KEYS = new Set(["status", "previous_status", "compression_status"]);

const FALLBACK_TIMESTAMP = "2026-05-12T08:30:00.000Z";
const DEFAULT_SUCCESS_MESSAGE = "Data berhasil diambil.";

function lowercaseStatuses(value) {
  if (Array.isArray(value)) {
    value.forEach(lowercaseStatuses);
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      if (STATUS_KEYS.has(key) && typeof entry === "string") {
        value[key] = entry.toLowerCase();
      } else {
        lowercaseStatuses(entry);
      }
    }
  }
}

function renameCampaignName(value) {
  if (Array.isArray(value)) {
    value.forEach(renameCampaignName);
    return;
  }
  if (value && typeof value === "object") {
    // Objek kampanye: punya `subject` + (`recipients` | `total_recipients`).
    if (
      typeof value.name === "string" &&
      typeof value.subject === "string" &&
      ("total_recipients" in value || "recipients" in value)
    ) {
      value.title = value.name;
      delete value.name;
    }
    for (const entry of Object.values(value)) renameCampaignName(entry);
  }
}

const CONTENT_MARKERS = ["title", "name", "label", "product", "caption", "subject"];
const NON_CONTENT_MARKERS = [
  "email",
  "phone",
  "compression_status",
  "read",
  "provider",
  "content_mode",
  "role",
  "media_type",
  "total_recipients",
  "internal_note",
  "consent_status",
  "attempts",
];

/** Objek konten legacy (id + penanda konten, tanpa penanda non-konten). */
function isContentLike(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (typeof value.id !== "number") return false;
  const keys = new Set(Object.keys(value));
  if (!CONTENT_MARKERS.some((marker) => keys.has(marker))) return false;
  if (NON_CONTENT_MARKERS.some((marker) => keys.has(marker))) return false;
  return true;
}

/**
 * Portofolio admin v1 memakai nama field berbeda dari legacy:
 * `media_file_id` → `image_media_id`, `media_file` → `cover_image`,
 * `media_files` → `images` (drop `media_file_ids` yang hanya input).
 * `cover_image: null` dibuang (opsional, tak boleh null).
 */
function renamePortfolioFields(value) {
  if (Array.isArray(value)) {
    value.forEach(renamePortfolioFields);
    return;
  }
  if (!value || typeof value !== "object") return;
  const keys = new Set(Object.keys(value));
  const isPortfolio =
    typeof value.category_id === "number" && (keys.has("media_files") || keys.has("media_file"));
  // Item admin yang sudah setengah-v1 (images string) — naikkan ke objek.
  const hasStringImages =
    typeof value.category_id === "number" &&
    Array.isArray(value.images) &&
    value.images.length > 0 &&
    typeof value.images[0] === "string";
  if (isPortfolio) {
    if ("media_file_id" in value) {
      value.image_media_id = value.media_file_id;
      delete value.media_file_id;
    }
    if ("media_file" in value) {
      value.cover_image = value.media_file;
      delete value.media_file;
    }
    if (Array.isArray(value.media_files)) {
      value.images = value.media_files;
    } else if (typeof value.images === "undefined") {
      value.images = [];
    }
    delete value.media_files;
    delete value.media_file_ids;
    if (value.cover_image === null || value.cover_image === undefined) {
      delete value.cover_image;
    }
  }
  if (hasStringImages && (!Array.isArray(value.images) || typeof value.images[0] === "string")) {
    // Detail/item admin menyimpan URL string — naikkan ke MediaPreview.
    value.images = value.images.map((url, index) =>
      synthesizeMediaPreview(value.id * 1000 + 10 + index, { large_url: url }),
    );
  }
  for (const entry of Object.values(value)) renamePortfolioFields(entry);
}

/** Objek kontak marketing (punya email + penanda konsen/status, bukan lead). */
function isMarketingContactLike(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (typeof value.email !== "string") return false;
  const keys = new Set(Object.keys(value));
  if (keys.has("message") || keys.has("phone") || keys.has("attempts") || keys.has("campaign_id")) {
    return false;
  }
  // Pengguna admin bukan kontak marketing.
  if (keys.has("role") || keys.has("permissions")) return false;
  if (keys.has("consent_status") || keys.has("source")) return true;
  if (keys.has("status")) return true;
  // Sampel audiens: id + nama + email + perusahaan, tanpa penanda lain.
  return typeof value.id === "number" && typeof value.name === "string";
}

function backfillMarketingContact(value) {
  if (Array.isArray(value)) {
    value.forEach(backfillMarketingContact);
    return;
  }
  if (!value || typeof value !== "object") return;
  if (isMarketingContactLike(value)) {
    if (value.source === undefined) value.source = "manual";
    if (value.consent_status === undefined) value.consent_status = "unknown";
    if (value.status === undefined) value.status = "active";
    if (value.created_at === undefined) value.created_at = FALLBACK_TIMESTAMP;
    if (value.updated_at === undefined) value.updated_at = FALLBACK_TIMESTAMP;
  }
  for (const entry of Object.values(value)) backfillMarketingContact(entry);
}

/** Objek prospek/kampanye terpotong (ringkasan dashboard): lengkapi field wajib. */
function backfillTrimmedDetails(value) {
  if (Array.isArray(value)) {
    value.forEach(backfillTrimmedDetails);
    return;
  }
  if (!value || typeof value !== "object") return;
  const keys = new Set(Object.keys(value));
  const isLeadLike =
    typeof value.id === "number" &&
    typeof value.name === "string" &&
    (typeof value.email === "string" || typeof value.phone === "string");
  if (isLeadLike || keys.has("total_recipients")) {
    if (value.updated_at === undefined) value.updated_at = value.created_at ?? FALLBACK_TIMESTAMP;
    if (value.created_at === undefined) value.created_at = FALLBACK_TIMESTAMP;
  }
  if (isLeadLike && typeof value.email === "string" && value.message === undefined) {
    value.message = "Pesan tidak tersedia.";
  }
  // Artikel ringkas (latest_news beranda): isi dari ringkasan bila kosong.
  if (
    typeof value.excerpt === "string" &&
    value.content === undefined &&
    typeof value.slug === "string"
  ) {
    value.content = value.excerpt ? [value.excerpt] : [];
  }
  for (const entry of Object.values(value)) backfillTrimmedDetails(entry);
}

/**
 * Item portofolio publik legacy menyimpan `images` sebagai objek
 * {thumbnail_url, medium_url, large_url} — kontrak v1 memakai string URI.
 * Hanya di luar `featured_portfolios` (yang dinaikkan ke Portfolio penuh).
 */
function stringifyPublicPortfolioImages(value, parentKey) {
  if (Array.isArray(value)) {
    value.forEach((entry) => stringifyPublicPortfolioImages(entry, parentKey));
    return;
  }
  if (!value || typeof value !== "object") return;
  if (
    parentKey !== "featured_portfolios" &&
    typeof value.category_slug === "string" &&
    // Item admin (category_id numerik / is_featured) tidak disentuh.
    typeof value.category_id !== "number" &&
    value.is_featured === undefined &&
    Array.isArray(value.images) &&
    value.images.length > 0 &&
    typeof value.images[0] === "object"
  ) {
    value.images = value.images
      .map((image) => image?.large_url ?? image?.medium_url ?? image?.thumbnail_url ?? null)
      .filter((url) => typeof url === "string");
  }
  for (const [key, entry] of Object.entries(value)) stringifyPublicPortfolioImages(entry, key);
}

/** MediaPreview minimal deterministik dari URL publik (mock sintetis). */
function synthesizeMediaPreview(id, urls) {
  const fileUrl = urls.large_url ?? urls.medium_url ?? urls.thumbnail_url ?? null;
  if (!fileUrl) return null;
  return {
    id,
    media_type: "image",
    mime_type: "image/webp",
    original_file_name: `mock-${id}.webp`,
    compression_status: "completed",
    file_url: fileUrl,
    thumbnail_url: urls.thumbnail_url ?? fileUrl,
    medium_url: urls.medium_url ?? fileUrl,
    large_url: urls.large_url ?? fileUrl,
    poster_url: null,
    video_url: null,
    width: 1600,
    height: 1000,
    duration_seconds: null,
    created_at: FALLBACK_TIMESTAMP,
    updated_at: FALLBACK_TIMESTAMP,
  };
}

/**
 * Item unggulan beranda legacy berbentuk publik (thumbnail_url/medium_url) —
 * kontrak memakai Portfolio penuh. Naikkan ke bentuk penuh deterministik,
 * hanya di dalam array `featured_portfolios`.
 */
function upgradeFeaturedPortfolios(value, parentKey) {
  if (Array.isArray(value)) {
    value.forEach((entry) => upgradeFeaturedPortfolios(entry, parentKey));
    return;
  }
  if (!value || typeof value !== "object") return;
  if (
    parentKey === "featured_portfolios" &&
    typeof value.id === "number" &&
    typeof value.title === "string" &&
    typeof value.medium_url === "string" &&
    value.is_featured === undefined &&
    typeof value.category === "string"
  ) {
    value.is_featured = true;
    if (value.description === undefined) value.description = null;
    if (value.category_id === undefined) value.category_id = null;
    const cover = synthesizeMediaPreview(value.id * 1000 + 1, value);
    if (cover) {
      if (value.cover_image === undefined) value.cover_image = cover;
      if (
        !Array.isArray(value.images) ||
        (value.images.length > 0 && typeof value.images[0] === "string")
      ) {
        value.images = [cover];
      }
    } else if (!Array.isArray(value.images)) {
      value.images = [];
    }
  }
  for (const [key, entry] of Object.entries(value)) upgradeFeaturedPortfolios(entry, key);
}

/** Isi field wajib v1 yang tidak ada di legacy dengan default deterministik. */
function backfillContentDefaults(value) {
  if (Array.isArray(value)) {
    value.forEach(backfillContentDefaults);
    return;
  }
  if (!value || typeof value !== "object") return;
  if (isContentLike(value)) {
    if (value.sort_order === undefined) value.sort_order = 0;
    if (value.status === undefined) value.status = "published";
    if (value.previous_status === undefined) value.previous_status = null;
    if (value.archived_at === undefined) value.archived_at = null;
    if (value.created_at === undefined) value.created_at = FALLBACK_TIMESTAMP;
    if (value.updated_at === undefined) value.updated_at = FALLBACK_TIMESTAMP;
  }
  for (const entry of Object.values(value)) backfillContentDefaults(entry);
}

function convertFile(basename, raw) {
  if (!basename.endsWith(".json")) return null;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn(` Lewati (bukan JSON): ${basename}`);
    return null;
  }
  if (typeof parsed.success !== "boolean") {
    console.warn(` Lewati (bukan envelope): ${basename}`);
    return null;
  }
  const out = { success: parsed.success };
  if (parsed.success) {
    out.message = typeof parsed.message === "string" ? parsed.message : DEFAULT_SUCCESS_MESSAGE;
    let { data } = parsed;
    if (data && typeof data === "object" && !Array.isArray(data) && Array.isArray(data.items)) {
      const { items, pagination, next_cursor, has_more, ...rest } = data;
      if (Object.keys(rest).length > 0) {
        console.warn(
          ` Field tambahan selain items/pagination di ${basename}: ${Object.keys(rest).join(",")}`,
        );
      }
      out.data = items;
      if (typeof next_cursor !== "undefined" || typeof has_more !== "undefined") {
        // List cursor (portofolio & galeri publik): meta { limit, next_cursor, has_more }.
        out.meta = {
          limit: items.length,
          next_cursor: next_cursor ?? null,
          has_more: has_more ?? false,
        };
      } else if (pagination && typeof pagination === "object") {
        const { page = 1, limit = items.length, total = items.length } = pagination;
        out.meta = {
          page,
          limit,
          total,
          total_pages: Math.max(1, Math.ceil(total / Math.max(1, limit))),
        };
      }
    } else {
      out.data = data;
    }
    if (parsed.meta && typeof parsed.meta === "object" && !out.meta) {
      const { request_id, timestamp, ...rest } = parsed.meta;
      if (Object.keys(rest).length > 0) out.meta = rest;
    }
  } else {
    out.code = parsed.code;
    out.message = parsed.message;
    out.errors = parsed.errors ?? [];
    out.request_id = "req_seed";
  }
  lowercaseStatuses(out.data);
  renameCampaignName(out.data);
  renamePortfolioFields(out.data);
  // Kategori portofolio PUBLIK: data array → { items } sesuai kontrak
  // (admin memakai list offset: data array + meta pagination).
  if (basename.includes("public-portfolio-categories") && Array.isArray(out.data)) {
    out.data = { items: out.data };
  }
  stringifyPublicPortfolioImages(out.data, undefined);
  upgradeFeaturedPortfolios(out.data, undefined);
  backfillContentDefaults(out.data);
  backfillMarketingContact(out.data);
  backfillTrimmedDetails(out.data);
  // SEO per route memakai bentuk SeoLegacy {title, description, canonical_url,
  // og_image_url, noindex} — pastikan `noindex` boolean.
  if (
    basename.includes("public-seo-") &&
    out.data &&
    typeof out.data === "object" &&
    !Array.isArray(out.data)
  ) {
    const seo = out.data;
    if (typeof seo.noindex !== "boolean") seo.noindex = false;
  }
  // BC-12 vs kontrak: kontrak masih mewajibkan `pending_revalidation` pada
  // ringkasan dashboard — mock mengikuti kontrak, UI mengabaikannya.
  if (
    basename.includes("admin-dashboard") &&
    out.data &&
    typeof out.data === "object" &&
    out.data.totals &&
    typeof out.data.totals === "object" &&
    out.data.totals.pending_revalidation === undefined
  ) {
    out.data.totals.pending_revalidation = 0;
  }
  return out;
}

function main() {
  mkdirSync(seedDir, { recursive: true });
  let converted = 0;
  let skipped = 0;
  for (const sub of ["legacy-public", "legacy-admin"]) {
    const dir = join(fixturesDir, sub);
    let files = [];
    try {
      files = readdirSync(dir).sort();
    } catch {
      console.warn(` Direktori tidak ada: ${dir}`);
      continue;
    }
    for (const basename of files) {
      const raw = readFileSync(join(dir, basename), "utf8");
      const out = convertFile(`${sub}/${basename}`, raw);
      if (!out) {
        skipped += 1;
        continue;
      }
      writeFileSync(join(seedDir, basename), `${JSON.stringify(out, null, 2)}\n`);
      converted += 1;
    }
  }
  console.log(`convert-legacy: ${converted} seed ditulis, ${skipped} dilewati.`);
}

main();
