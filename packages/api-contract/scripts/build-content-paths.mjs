#!/usr/bin/env node
// Generator 12 resource admin-content (PLAN-01 §1.6).
// Output: src/paths/admin-content.yaml (di-commit).
// 86 endpoint legacy dipetakan ke 108 operasi v1 (2 route generik dipecah ke 24 path eksplisit).
//
// Spesifikasi: legacy apps/api/src/admin-content/{admin-content.controller.ts,
// admin-content.service.ts, dto/*.ts}. Semua resource legacy memakai SATU DTO bersama
// (`AdminContentDto`): field DTO yang tidak relevan untuk suatu resource tetap diterima (divalidasi
// tipenya) lalu diabaikan. Kontrak meniru itu: field relevan diketik lengkap, field DTO lain
// dicantumkan `deprecated: true` ("diabaikan"). Field di luar DTO → 400 (forbidNonWhitelisted).
//
//   node scripts/build-content-paths.mjs
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = join(pkgDir, "src", "paths", "admin-content.yaml");

const NO_STORE = "no-store";
const TS = "2026-05-12T08:30:00.000Z";
const NO_CHANGE = "Tidak ada perubahan bentuk data selain envelope v1.";

const REF = {
  successBase: "../components/schemas/envelope.yaml#/SuccessBase",
  pagination: "../components/schemas/envelope.yaml#/PaginationMeta",
  contentStatusUpdate: "../components/schemas/content.yaml#/ContentStatusUpdate",
  reorderInput: "../components/schemas/content.yaml#/ReorderInput",
  reorderResult: "../components/schemas/content.yaml#/ReorderResult",
  deleteResult: "../components/schemas/content.yaml#/ContentDeleteResult",
  writableStatus: "../components/schemas/common.yaml#/WritableContentStatus",
  idPath: "../components/parameters.yaml#/IdPath",
  archiveIdPath: "../components/parameters.yaml#/ArchiveIdPath",
  badRequest: "../components/responses.yaml#/BadRequest",
  validation: "../components/responses.yaml#/ValidationError",
  mediaNotReady: "../components/responses.yaml#/ValidationOrMediaNotReady",
  unauth: "../components/responses.yaml#/Unauthenticated",
  forbidden: "../components/responses.yaml#/Forbidden",
  notFound: "../components/responses.yaml#/NotFound",
  conflict: "../components/responses.yaml#/Conflict",
  unprocessable: "../components/responses.yaml#/Unprocessable",
  rateLimited: "../components/responses.yaml#/RateLimited",
  internal: "../components/responses.yaml#/InternalError",
  xRequestId: "../components/headers.yaml#/XRequestId",
};

// --- Field AdminContentDto (dto/admin-content.dto.ts) --------------------------------------
// Tipe dasar persis dekorator legacy. `trim` = @Transform(trimString).
// `IsOptional()` legacy menerima null: field yang kolomnya nullable diberi `nullable` (null
// mengosongkan kolom); field lain tetap non-null.
const SLUG_PATTERN = "^[a-z0-9]+(-[a-z0-9]+)*$";
const DTO_FIELDS = {
  title: { type: "string", trim: true },
  name: { type: "string", trim: true },
  slug: { type: "string", pattern: SLUG_PATTERN },
  subtitle: { type: "string", trim: true },
  cta_label: { type: "string", trim: true },
  cta_href: { type: "string", trim: true },
  label: { type: "string", trim: true },
  metric: { type: "string", trim: true },
  value: { type: "string", trim: true },
  suffix: { type: "string", trim: true },
  segment: { type: "string", trim: true },
  category: { type: "string", trim: true },
  category_id: { type: "integer", minimum: 1 },
  short_description: { type: "string", trim: true },
  description: { type: "string", trim: true },
  alt_text: { type: "string", trim: true },
  caption: { type: "string", trim: true },
  excerpt: { type: "string", trim: true },
  content: { type: "array", items: { type: "string" } },
  product: { type: "string", trim: true },
  unit: { type: "string", trim: true },
  hero_section_id: { type: "integer", minimum: 0 },
  media_file_id: { type: "integer", minimum: 1 },
  media_file_ids: { type: "array", maxItems: 10, items: { type: "integer", minimum: 1 } },
  logo_media_id: { type: "integer", minimum: 1 },
  poster_media_id: { type: "integer", minimum: 1 },
  thumbnail_media_file_id: { type: "integer", minimum: 1 },
  og_image_media_file_id: { type: "integer", minimum: 1 },
  media_type: { type: "string", enum: ["image", "video"] },
  is_featured: { type: "boolean" },
  sort_order: { type: "integer", minimum: 0, maximum: 1000000 },
  status: { $ref: REF.writableStatus },
  published_at: { type: "string" },
  seo_title: { type: "string", trim: true },
  seo_description: { type: "string", trim: true },
};
const DTO_FIELD_NAMES = Object.keys(DTO_FIELDS);

// Deskripsi field relevan (dipakai bila resource tidak memberi deskripsi sendiri).
const FIELD_NOTES = {
  slug: "Tanpa slug saat create → dibentuk dari judul/nama (huruf kecil, non-alfanumerik → `-`; kosong → `konten-<ms>`). Pola saja, tanpa batas panjang di DTO (kolom DB VARCHAR).",
  status: "Default create `draft` (kategori portofolio: `published`). `archived` hanya lewat endpoint arsip.",
  sort_order: "0–1.000.000; default create 0.",
  published_at: "ISO 8601 (`IsISO8601`: tanggal atau tanggal-waktu). Masa depan di-clamp ke now; tanpa nilai & status `published` → now. Pada PATCH hanya dipakai bila `status: published` ikut dikirim.",
  media: "Wajib media `completed` (ada) — bila tidak → 400 `UNPROCESSABLE_ENTITY`. `null` mengosongkan rujukan.",
};

function withNull(schema) {
  if (schema.$ref) return { oneOf: [{ $ref: schema.$ref }, { type: "null" }] };
  const t = Array.isArray(schema.type) ? schema.type : [schema.type];
  return { ...schema, type: t.includes("null") ? t : [...t, "null"] };
}

function fieldSchema(name, spec, { forCreate, required }) {
  const base = { ...DTO_FIELDS[name] };
  const trim = base.trim;
  delete base.trim;
  let schema = { ...base, ...(spec.schema ?? {}) };
  if (forCreate && required && schema.type === "string" && !schema.enum && !schema.pattern) schema.minLength = 1;
  const nullable = spec.nullable && !(forCreate && required);
  if (nullable) schema = withNull(schema);
  const notes = [];
  if (spec.description) notes.push(spec.description);
  if (trim) notes.push("Di-trim.");
  if (notes.length) schema.description = notes.join(" ");
  if (spec.examples) schema.examples = spec.examples;
  return schema;
}

function ignoredFieldSchema(name) {
  const base = { ...DTO_FIELDS[name] };
  delete base.trim;
  const schema = withNull(base);
  return {
    ...schema,
    deprecated: true,
    description: "Diabaikan untuk resource ini — diterima (dan divalidasi tipenya) demi paritas DTO bersama legacy `AdminContentDto`.",
  };
}

function reqSchema(r, { forCreate }) {
  const required = forCreate ? r.requiredCreate : [];
  const properties = {};
  for (const [name, spec] of Object.entries(r.fields)) {
    properties[name] = fieldSchema(name, spec, { forCreate, required: required.includes(name) });
  }
  for (const name of DTO_FIELD_NAMES) {
    if (!properties[name]) properties[name] = ignoredFieldSchema(name);
  }
  return {
    type: "object",
    additionalProperties: false,
    ...(required.length ? { required } : {}),
    properties,
  };
}

function successData(schemaRef, exampleData, message = "Data berhasil diambil.", status = "Berhasil.") {
  return {
    description: status,
    headers: { "X-Request-Id": { $ref: REF.xRequestId } },
    content: {
      "application/json": {
        schema: {
          allOf: [
            { $ref: REF.successBase },
            { type: "object", required: ["data"], properties: { data: { $ref: schemaRef } } },
          ],
        },
        example: { success: true, message, data: exampleData },
      },
    },
  };
}

function successList(schemaRef, exampleItem) {
  return {
    description: "Berhasil.",
    headers: { "X-Request-Id": { $ref: REF.xRequestId } },
    content: {
      "application/json": {
        schema: {
          allOf: [
            { $ref: REF.successBase },
            {
              type: "object",
              required: ["data", "meta"],
              properties: { data: { type: "array", items: { $ref: schemaRef } }, meta: { $ref: REF.pagination } },
            },
          ],
        },
        example: {
          success: true,
          message: "Data berhasil diambil.",
          data: [exampleItem],
          meta: { page: 1, limit: 10, total: 1, total_pages: 1 },
        },
      },
    },
  };
}

// Legacy AdminListQueryDto (dto/admin-list-query.dto.ts) dipakai SEMUA list konten: setiap
// parameter diterima di setiap list, tetapi hanya berpengaruh pada resource tertentu.
function listParams() {
  return [
    { name: "page", in: "query", required: false, description: "Halaman (mulai 1). Bukan bilangan bulat ≥ 1 → 400 `VALIDATION_ERROR`.", schema: { type: "integer", minimum: 1, default: 1 } },
    { name: "limit", in: "query", required: false, description: "Batas per halaman; > 100 → 400 `VALIDATION_ERROR`.", schema: { type: "integer", minimum: 1, default: 10, maximum: 100 } },
    { name: "q", in: "query", required: false, description: "Kata kunci (di-trim; `contains`). Kolom yang dicari berbeda per resource.", schema: { type: "string" } },
    { name: "status", in: "query", required: false, description: "Filter status. Tanpa filter, konten `archived` disembunyikan.", schema: { type: "string", enum: ["draft", "published", "inactive", "archived"] } },
    { name: "category", in: "query", required: false, description: "Di-trim. Hanya berpengaruh pada portofolio (teks/nama/slug kategori) dan berita (kategori persis); resource lain mengabaikan.", schema: { type: "string" } },
    { name: "segment", in: "query", required: false, description: "Di-trim. Hanya berpengaruh pada partner (segment persis); resource lain mengabaikan.", schema: { type: "string" } },
    { name: "type", in: "query", required: false, description: "Hanya berpengaruh pada item galeri; resource lain mengabaikan.", schema: { type: "string", enum: ["image", "video"] } },
  ];
}

// --- Contoh respons (semua key presenter) --------------------------------------------------
const LC = { previous_status: null, archived_at: null, created_at: TS, updated_at: TS };
function mediaPreview(id, overrides = {}) {
  return {
    id,
    media_type: "image",
    mime_type: "image/webp",
    original_file_name: `media-${id}.jpg`,
    compression_status: "completed",
    file_url: `https://media.indobraga.com/upload/prod/lainnya/2026-05-12/m${id}-large.webp`,
    thumbnail_url: `https://media.indobraga.com/upload/prod/lainnya/2026-05-12/m${id}-thumbnail.webp`,
    medium_url: `https://media.indobraga.com/upload/prod/lainnya/2026-05-12/m${id}-medium.webp`,
    large_url: `https://media.indobraga.com/upload/prod/lainnya/2026-05-12/m${id}-large.webp`,
    poster_url: null,
    video_url: null,
    width: 1600,
    height: 900,
    duration_seconds: null,
    created_at: TS,
    updated_at: TS,
    ...overrides,
  };
}

const HERO_SLIDE_EXAMPLE = { id: 1, hero_section_id: 1, label: "Terpercaya", title: "Cetak Offset Berkualitas", metric: "10.000+ pcs/hari", alt_text: "Mesin cetak", media_file_id: 10, media_file: mediaPreview(10), sort_order: 1, status: "published", ...LC };
const HERO_EXAMPLE = { id: 1, title: "Jasa Cetak Kardus & Packaging", subtitle: "Sejak 2010.", cta_label: "Hubungi Kami", cta_href: "/kontak", status: "published", ...LC };

// --- Resource ----------------------------------------------------------------------------
// fields: field relevan { nullable?, description?, schema? }.
// hasMedia: body merujuk media → 400 bisa `UNPROCESSABLE_ENTITY` (media belum completed).
// createConflict/updateConflict: kolom unik (P2002 → 409). *Unprocessable: 422 legacy.
const MEDIA = FIELD_NOTES.media;
const RESOURCES = [
  {
    key: "hero", schema: "HeroSection", detailSchema: "HeroSectionDetail", module: "profile", opPrefix: "Hero",
    singular: "hero", hasReorder: false, order: "id desc", searchCols: "title, subtitle",
    fields: {
      title: {},
      subtitle: { nullable: true },
      cta_label: { nullable: true, description: "Kosong/null → `primary_cta` publik null." },
      cta_href: { nullable: true },
      status: { description: FIELD_NOTES.status },
    },
    requiredCreate: ["title"],
    itemExample: HERO_EXAMPLE,
    detailExample: { ...HERO_EXAMPLE, slides: [HERO_SLIDE_EXAMPLE] },
    createExample: { title: "Jasa Cetak Kardus & Packaging", subtitle: "Sejak 2010.", cta_label: "Hubungi Kami", cta_href: "/kontak" },
  },
  {
    key: "hero-slides", schema: "HeroSlide", module: "profile", opPrefix: "HeroSlide",
    singular: "slide hero", hasReorder: true, hasMedia: true, order: "sort_order asc, id asc", searchCols: "title, label",
    fields: {
      hero_section_id: { nullable: true, description: "Create: 0/null/tidak dikirim → hero pertama (id terkecil; tidak ada hero → 422). PATCH: hanya dipakai bila > 0. Id tidak ada tidak dicek (legacy: error DB)." },
      label: { nullable: true },
      title: {},
      metric: { nullable: true },
      alt_text: { nullable: true },
      media_file_id: { nullable: true, description: MEDIA },
      sort_order: { description: FIELD_NOTES.sort_order },
      status: { description: FIELD_NOTES.status },
    },
    requiredCreate: ["title"],
    createUnprocessable: "Belum ada hero section → 422.",
    itemExample: HERO_SLIDE_EXAMPLE,
    createExample: { title: "Cetak Offset Berkualitas", label: "Terpercaya", hero_section_id: 0, media_file_id: 10, sort_order: 1 },
  },
  {
    key: "partners", schema: "Partner", module: "profile", opPrefix: "Partner",
    singular: "partner", hasReorder: true, hasMedia: true, order: "sort_order asc, id asc", searchCols: "name (+ filter segment)",
    fields: {
      name: {},
      segment: { nullable: true },
      logo_media_id: { nullable: true, description: MEDIA },
      sort_order: { description: FIELD_NOTES.sort_order },
      status: { description: FIELD_NOTES.status },
    },
    requiredCreate: ["name"],
    itemExample: { id: 1, name: "PT Maju Bersama", segment: "FMCG", logo_media_id: 10, logo_media: mediaPreview(10), sort_order: 1, status: "published", ...LC },
    createExample: { name: "PT Maju Bersama", segment: "FMCG", logo_media_id: 10 },
  },
  {
    key: "production-strengths", schema: "ProductionStrength", module: "profile", opPrefix: "ProductionStrength",
    singular: "keunggulan produksi", hasReorder: true, order: "sort_order asc, id asc", searchCols: "label",
    fields: {
      label: {},
      value: {},
      suffix: { nullable: true },
      sort_order: { description: FIELD_NOTES.sort_order },
      status: { description: FIELD_NOTES.status },
    },
    requiredCreate: ["label", "value"],
    itemExample: { id: 1, label: "Kapasitas Harian", value: "50.000", suffix: "pcs", sort_order: 1, status: "published", ...LC },
    createExample: { label: "Kapasitas Harian", value: "50.000", suffix: "pcs" },
  },
  {
    key: "portfolio-categories", schema: "PortfolioCategory", module: "portfolio", opPrefix: "PortfolioCategory",
    singular: "kategori portofolio", hasReorder: true, order: "sort_order asc, id asc", searchCols: "name, slug",
    fields: {
      name: { description: "Unik." },
      slug: { description: `Unik. ${FIELD_NOTES.slug}` },
      sort_order: { description: FIELD_NOTES.sort_order },
      status: { description: FIELD_NOTES.status },
    },
    requiredCreate: ["name"],
    createConflict: true, updateConflict: true,
    itemExample: { id: 1, name: "Box & Karton", slug: "box-karton", sort_order: 1, status: "published", ...LC },
    createExample: { name: "Box & Karton" },
    deleteConflict: "Kategori yang masih dipakai portofolio mana pun → 409 `CONFLICT`.",
  },
  {
    key: "portfolios", schema: "Portfolio", module: "portfolio", opPrefix: "Portfolio",
    singular: "portofolio", hasReorder: true, hasMedia: true, order: "sort_order asc, id asc", searchCols: "title, category, nama kategori, description (+ filter category)",
    fields: {
      title: {},
      slug: { description: `Unik. ${FIELD_NOTES.slug}` },
      category_id: { description: "Kategori wajib ada & `published` (bila tidak → 422). Create: wajib. PATCH: bila dikirim, `category` teks ikut disinkronkan ke nama kategori." },
      category: { description: "Hanya dipakai PATCH tanpa `category_id` (menimpa teks kategori denormalisasi); create mengabaikan." },
      short_description: { nullable: true, description: "Disimpan ke kolom `description`." },
      description: { nullable: true, description: "Fallback bila `short_description` tidak dikirim (kolom yang sama)." },
      media_file_ids: { nullable: true, description: `Galeri berurutan (maks 10; duplikat dibuang dengan urutan dipertahankan; pertama = cover). Tiap media wajib \`completed\` (bila tidak → 400 \`UNPROCESSABLE_ENTITY\`). PATCH: dikirim (termasuk \`null\`/\`[]\`) → galeri diganti atomik; tidak dikirim → tidak diubah.` },
      media_file_id: { nullable: true, description: "Bentuk lama satu gambar; dipakai hanya bila `media_file_ids` bukan array. PATCH: dikirim (termasuk `null`) → galeri diganti." },
      is_featured: { description: "Legacy `@Transform(v => v === true || v === \"true\")`: nilai selain `true`/`\"true\"` (termasuk `null`) menjadi false. Default create false." },
      sort_order: { description: FIELD_NOTES.sort_order },
      status: { description: `${FIELD_NOTES.status} \`published\` butuh ≥ 1 gambar & kategori \`published\` (422).` },
      published_at: { description: FIELD_NOTES.published_at },
      seo_title: { nullable: true },
      seo_description: { nullable: true },
    },
    requiredCreate: ["title", "category_id"],
    bodyChange: "`is_featured` dideklarasikan boolean JSON; legacy juga menerima nilai lain (Transform: `\"true\"` → true, selain itu false).",
    createConflict: true, updateConflict: true,
    createUnprocessable: "Kategori tidak ada/tidak `published`, atau `status: published` tanpa gambar → 422.",
    updateUnprocessable: "Status efektif `published` tanpa gambar atau kategori tidak `published`; `category_id` tidak valid → 422.",
    statusUnprocessable: "Publish tanpa cover (`media_file_id`) atau kategori tidak `published` → 422.",
    itemExample: {
      id: 1, title: "Kemasan Kopi Premium", slug: "kemasan-kopi-premium", category_id: 2, category: "Box & Karton", category_slug: "box-karton",
      short_description: "Kemasan kopi 250gr.", media_file_id: 10, media_file: mediaPreview(10), media_file_ids: [10, 11],
      media_files: [mediaPreview(10), mediaPreview(11)],
      images: [
        { id: 1, media_file_id: 10, sort_order: 0, media_file: mediaPreview(10) },
        { id: 2, media_file_id: 11, sort_order: 1, media_file: mediaPreview(11) },
      ],
      is_featured: true, sort_order: 1, status: "published", previous_status: null, archived_at: null, published_at: TS,
      seo_title: null, seo_description: null, created_at: TS, updated_at: TS,
    },
    createExample: { title: "Kemasan Kopi Premium", category_id: 2, short_description: "Kemasan kopi 250gr.", media_file_ids: [10, 11], is_featured: true },
  },
  {
    key: "machines", schema: "Machine", module: "profile", opPrefix: "Machine",
    singular: "mesin", hasReorder: true, hasMedia: true, order: "sort_order asc, id asc", searchCols: "name, description",
    fields: {
      name: {},
      slug: { description: `Unik. ${FIELD_NOTES.slug}` },
      metric: { nullable: true },
      description: { nullable: true },
      media_file_id: { nullable: true, description: MEDIA },
      sort_order: { description: FIELD_NOTES.sort_order },
      status: { description: FIELD_NOTES.status },
    },
    requiredCreate: ["name"],
    createConflict: true, updateConflict: true,
    itemExample: { id: 1, name: "Heidelberg Speedmaster", slug: "heidelberg-speedmaster", metric: "18.000 lbr/jam", description: "Mesin offset 4 warna.", media_file_id: 10, media_file: mediaPreview(10), sort_order: 1, status: "published", ...LC },
    createExample: { name: "Heidelberg Speedmaster", metric: "18.000 lbr/jam", media_file_id: 10 },
  },
  {
    key: "printing-capacities", schema: "PrintingCapacity", module: "profile", opPrefix: "PrintingCapacity",
    singular: "kapasitas cetak", hasReorder: true, hasMedia: true, order: "sort_order asc, id asc", searchCols: "label, description",
    fields: {
      label: {},
      value: {},
      unit: {},
      description: { nullable: true },
      media_file_id: { nullable: true, description: MEDIA },
      sort_order: { description: FIELD_NOTES.sort_order },
      status: { description: FIELD_NOTES.status },
    },
    requiredCreate: ["label", "value", "unit"],
    itemExample: { id: 1, label: "Offset Printing", value: "50.000", unit: "lembar/hari", description: "Cetak offset hingga B1.", media_file_id: null, media_file: null, sort_order: 1, status: "published", ...LC },
    createExample: { label: "Offset Printing", value: "50.000", unit: "lembar/hari" },
  },
  {
    key: "production-capacities", schema: "ProductionCapacity", module: "profile", opPrefix: "ProductionCapacity",
    singular: "kapasitas produksi", hasReorder: true, order: "sort_order asc, id asc", searchCols: "product",
    fields: {
      product: {},
      value: {},
      unit: {},
      sort_order: { description: FIELD_NOTES.sort_order },
      status: { description: FIELD_NOTES.status },
    },
    requiredCreate: ["product", "value", "unit"],
    itemExample: { id: 1, product: "Kardus Box", value: "100.000", unit: "pcs/bulan", sort_order: 1, status: "published", ...LC },
    createExample: { product: "Kardus Box", value: "100.000", unit: "pcs/bulan" },
  },
  {
    key: "services", schema: "ServiceItem", module: "profile", opPrefix: "Service",
    singular: "layanan", hasReorder: true, order: "sort_order asc, id asc", searchCols: "name",
    fields: {
      name: {},
      sort_order: { description: FIELD_NOTES.sort_order },
      status: { description: FIELD_NOTES.status },
    },
    requiredCreate: ["name"],
    itemExample: { id: 1, name: "Desain Kemasan", sort_order: 1, status: "published", ...LC },
    createExample: { name: "Desain Kemasan" },
  },
  {
    key: "gallery-items", schema: "GalleryItem", module: "gallery", opPrefix: "GalleryItem",
    singular: "item galeri", hasReorder: true, hasMedia: true, order: "sort_order asc, id asc", searchCols: "caption (+ filter type)",
    fields: {
      media_file_id: { nullable: true, description: `Create: wajib. ${MEDIA}` },
      media_type: {},
      caption: {},
      poster_media_id: { nullable: true, description: MEDIA },
      sort_order: { description: FIELD_NOTES.sort_order },
      status: { description: FIELD_NOTES.status },
      published_at: { description: FIELD_NOTES.published_at },
    },
    requiredCreate: ["media_file_id", "media_type", "caption"],
    itemExample: { id: 1, media_type: "image", caption: "Proses cetak offset", media_file_id: 10, media_file: mediaPreview(10), poster_media_id: null, poster_media: null, sort_order: 1, status: "published", previous_status: null, archived_at: null, published_at: TS, created_at: TS, updated_at: TS },
    createExample: { media_file_id: 10, media_type: "image", caption: "Proses cetak offset" },
  },
  {
    key: "news", schema: "NewsArticle", module: "news", opPrefix: "News",
    singular: "berita", hasReorder: false, hasMedia: true, order: "published_at desc, id desc", searchCols: "title, slug, excerpt (+ filter category)",
    fields: {
      title: {},
      slug: { description: `Unik. ${FIELD_NOTES.slug}` },
      category: {},
      excerpt: {},
      content: { description: "Paragraf. `status: published` butuh ≥ 1 paragraf (422)." },
      thumbnail_media_file_id: { nullable: true, description: MEDIA },
      og_image_media_file_id: { nullable: true, description: MEDIA },
      status: { description: FIELD_NOTES.status },
      published_at: { description: FIELD_NOTES.published_at },
      seo_title: { nullable: true },
      seo_description: { nullable: true },
    },
    requiredCreate: ["title", "category", "excerpt"],
    createConflict: true, updateConflict: true,
    createUnprocessable: "`status: published` dengan `content` kosong → 422.",
    updateUnprocessable: "Status efektif `published` dengan konten (baru atau tersimpan) kosong → 422.",
    itemExample: { id: 1, title: "Tips Memilih Kemasan", slug: "tips-memilih-kemasan", category: "Tips", excerpt: "Ringkasan singkat.", content: ["Paragraf 1.", "Paragraf 2."], thumbnail_media_file_id: 10, thumbnail_media_file: mediaPreview(10), og_image_media_file_id: null, og_image_media_file: null, status: "published", previous_status: null, archived_at: null, published_at: TS, seo_title: null, seo_description: null, created_at: TS, updated_at: TS },
    createExample: { title: "Tips Memilih Kemasan", category: "Tips", excerpt: "Ringkasan singkat.", content: ["Paragraf 1."] },
  },
];

// Body meniru AdminContentDto bersama (field tak relevan = deprecated/diabaikan) → tanpa perubahan,
// kecuali `is_featured` portofolio yang dideklarasikan boolean kanonik.
const bodyChanges = (r) => r.bodyChange ?? NO_CHANGE;

const paths = {};
function addOp(path, method, op) {
  if (!paths[path]) paths[path] = {};
  if (paths[path][method]) throw new Error(`Duplikat ${method} ${path}`);
  paths[path][method] = op;
}

const getSec = [{ sessionCookie: [] }];
const mutSec = [{ sessionCookie: [], csrfHeader: [] }];

for (const r of RESOURCES) {
  const base = `/api/v1/admin/${r.key}`;
  const byId = `${base}/{id}`;
  const schemaRef = `../components/schemas/content.yaml#/${r.schema}`;
  const detailRef = `../components/schemas/content.yaml#/${r.detailSchema ?? r.schema}`;
  const tag = r.module;
  const perm = "content.manage";
  const bad400 = r.hasMedia ? REF.mediaNotReady : REF.validation;

  // LIST
  addOp(base, "get", {
    operationId: `list${r.opPrefix}s`,
    tags: [tag],
    summary: `Daftar ${r.singular}`,
    description: `List offset (legacy \`AdminListQueryDto\`, default 10, maks 100). Urut ${r.order}. Pencarian \`q\`: ${r.searchCols}. Tanpa filter \`status\`, konten \`archived\` disembunyikan.`,
    "x-module": r.module,
    "x-permission": perm,
    "x-rate-limit": "default",
    "x-cache-control": NO_STORE,
    "x-legacy": { method: "GET", path: base, changes: NO_CHANGE },
    security: getSec,
    parameters: listParams(),
    responses: {
      "200": successList(schemaRef, r.itemExample),
      "400": { $ref: REF.validation },
      "401": { $ref: REF.unauth },
      "403": { $ref: REF.forbidden },
      "429": { $ref: REF.rateLimited },
    },
  });

  // CREATE
  const createResponses = {
    "201": successData(schemaRef, r.itemExample, "Data berhasil dibuat.", "Dibuat (201, paritas legacy)."),
    "400": { $ref: bad400 },
    "401": { $ref: REF.unauth },
    "403": { $ref: REF.forbidden },
  };
  if (r.createConflict) createResponses["409"] = { $ref: REF.conflict };
  if (r.createUnprocessable) createResponses["422"] = { $ref: REF.unprocessable };
  createResponses["429"] = { $ref: REF.rateLimited };
  addOp(base, "post", {
    operationId: `create${r.opPrefix}`,
    tags: [tag],
    summary: `Buat ${r.singular}`,
    description: [
      `Buat ${r.singular} baru. Field wajib kosong (setelah trim) → 400 \`VALIDATION_ERROR\` "Lengkapi bagian wajib: …".`,
      r.hasMedia ? "Media rujukan tidak ada / belum `completed` → 400 `UNPROCESSABLE_ENTITY`." : null,
      r.createConflict ? "Nilai unik bentrok → 409 `CONFLICT`." : null,
      r.createUnprocessable ?? null,
    ].filter(Boolean).join(" "),
    "x-module": r.module,
    "x-permission": perm,
    "x-rate-limit": "default",
    "x-cache-control": NO_STORE,
    "x-legacy": { method: "POST", path: base, changes: bodyChanges(r) },
    security: mutSec,
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: reqSchema(r, { forCreate: true }),
          example: r.createExample,
        },
      },
    },
    responses: createResponses,
  });

  // REORDER
  if (r.hasReorder) {
    addOp(`${base}/reorder`, "patch", {
      operationId: `reorder${r.opPrefix}s`,
      tags: [tag],
      summary: `Urutkan ${r.singular}`,
      description: `Set \`sort_order\` beberapa ${r.singular} dalam satu transaksi (items min 1). Id yang tidak ada → transaksi batal dan legacy mengembalikan 500 \`INTERNAL_ERROR\` (error Prisma P2025 tidak ditangkap).`,
      "x-module": r.module,
      "x-permission": perm,
      "x-rate-limit": "default",
      "x-cache-control": NO_STORE,
      "x-legacy": { method: "PATCH", path: `${base}/reorder`, changes: NO_CHANGE },
      security: mutSec,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: REF.reorderInput },
            example: { items: [{ id: 1, sort_order: 1 }, { id: 2, sort_order: 2 }] },
          },
        },
      },
      responses: {
        "200": {
          description: "Berhasil.",
          headers: { "X-Request-Id": { $ref: REF.xRequestId } },
          content: {
            "application/json": {
              schema: { allOf: [{ $ref: REF.successBase }, { type: "object", required: ["data"], properties: { data: { $ref: REF.reorderResult } } }] },
              example: { success: true, message: "Urutan berhasil diperbarui.", data: { status: "updated", count: 2 } },
            },
          },
        },
        "400": { $ref: REF.validation },
        "401": { $ref: REF.unauth },
        "403": { $ref: REF.forbidden },
        "429": { $ref: REF.rateLimited },
        "500": { $ref: REF.internal },
      },
    });
  }

  // DETAIL
  addOp(byId, "get", {
    operationId: `get${r.opPrefix}`,
    tags: [tag],
    summary: `Detail ${r.singular}`,
    description: `Detail ${r.singular} (termasuk yang diarsip).${r.key === "hero" ? " Menyertakan `slides[]` (semua slide hero ini beserta `media_file`)." : ""}`,
    "x-module": r.module,
    "x-permission": perm,
    "x-rate-limit": "default",
    "x-cache-control": NO_STORE,
    "x-legacy": { method: "GET", path: byId, changes: NO_CHANGE },
    security: getSec,
    parameters: [{ $ref: REF.idPath }],
    responses: {
      "200": successData(detailRef, r.detailExample ?? r.itemExample),
      "400": { $ref: REF.validation },
      "401": { $ref: REF.unauth },
      "403": { $ref: REF.forbidden },
      "404": { $ref: REF.notFound },
      "429": { $ref: REF.rateLimited },
    },
  });

  // UPDATE
  const updateResponses = {
    "200": successData(schemaRef, r.itemExample, "Data berhasil diubah."),
    "400": { $ref: bad400 },
    "401": { $ref: REF.unauth },
    "403": { $ref: REF.forbidden },
    "404": { $ref: REF.notFound },
  };
  if (r.updateConflict) updateResponses["409"] = { $ref: REF.conflict };
  if (r.updateUnprocessable) updateResponses["422"] = { $ref: REF.unprocessable };
  updateResponses["429"] = { $ref: REF.rateLimited };
  addOp(byId, "patch", {
    operationId: `update${r.opPrefix}`,
    tags: [tag],
    summary: `Ubah ${r.singular}`,
    description: [
      `Ubah parsial ${r.singular}; field tidak dikirim tidak diubah, \`null\` pada field nullable mengosongkan kolom.`,
      r.hasMedia ? "Media rujukan tidak ada / belum `completed` → 400 `UNPROCESSABLE_ENTITY`." : null,
      r.updateConflict ? "Nilai unik bentrok → 409 `CONFLICT`." : null,
      r.updateUnprocessable ?? null,
      `Mengembalikan ${r.key === "hero" ? "hero tanpa `slides`" : "item terbaru"}.`,
    ].filter(Boolean).join(" "),
    "x-module": r.module,
    "x-permission": perm,
    "x-rate-limit": "default",
    "x-cache-control": NO_STORE,
    "x-legacy": { method: "PATCH", path: byId, changes: bodyChanges(r) },
    security: mutSec,
    parameters: [{ $ref: REF.idPath }],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: reqSchema(r, { forCreate: false }),
          example: r.createExample,
        },
      },
    },
    responses: updateResponses,
  });

  // STATUS
  const statusResponses = {
    "200": successData(schemaRef, r.itemExample, "Status berhasil diubah."),
    "400": { $ref: REF.validation },
    "401": { $ref: REF.unauth },
    "403": { $ref: REF.forbidden },
    "404": { $ref: REF.notFound },
  };
  if (r.statusUnprocessable) statusResponses["422"] = { $ref: REF.unprocessable };
  statusResponses["429"] = { $ref: REF.rateLimited };
  const writesPublishedAt = ["portfolios", "gallery-items", "news"].includes(r.key);
  addOp(`${byId}/status`, "patch", {
    operationId: `update${r.opPrefix}Status`,
    tags: [tag],
    summary: `Ubah status ${r.singular}`,
    description: [
      "Set status `draft|published|inactive` (tanpa mengubah `previous_status`/`archived_at`).",
      writesPublishedAt ? "`published` → `published_at` = now." : null,
      r.statusUnprocessable ?? null,
    ].filter(Boolean).join(" "),
    "x-module": r.module,
    "x-permission": perm,
    "x-rate-limit": "default",
    "x-cache-control": NO_STORE,
    "x-legacy": { method: "PATCH", path: `${byId}/status`, changes: NO_CHANGE },
    security: mutSec,
    parameters: [{ $ref: REF.idPath }],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: { $ref: REF.contentStatusUpdate },
          example: { status: "published" },
        },
      },
    },
    responses: statusResponses,
  });

  // DELETE permanen
  const deleteResponses = {
    "200": {
      description: "Berhasil.",
      headers: { "X-Request-Id": { $ref: REF.xRequestId } },
      content: {
        "application/json": {
          schema: { allOf: [{ $ref: REF.successBase }, { type: "object", required: ["data"], properties: { data: { $ref: REF.deleteResult } } }] },
          example: { success: true, message: "Data berhasil dihapus permanen.", data: { id: 1, status: "permanently_deleted", cleanup_failed_media_count: 0 } },
        },
      },
    },
    "400": { $ref: REF.validation },
    "401": { $ref: REF.unauth },
    "403": { $ref: REF.forbidden },
    "404": { $ref: REF.notFound },
  };
  if (r.deleteConflict) deleteResponses["409"] = { $ref: REF.conflict };
  deleteResponses["429"] = { $ref: REF.rateLimited };
  addOp(byId, "delete", {
    operationId: `delete${r.opPrefix}`,
    tags: [tag],
    summary: `Hapus permanen ${r.singular}`,
    description: `Hapus permanen ${r.singular}, lalu media yang dirujuknya dihapus bila tidak dipakai konten lain (gagal hapus storage dihitung di \`cleanup_failed_media_count\`, tidak menggagalkan request).${r.deleteConflict ? " " + r.deleteConflict : ""}`,
    "x-module": r.module,
    "x-permission": perm,
    "x-rate-limit": "default",
    "x-cache-control": NO_STORE,
    "x-legacy": { method: "DELETE", path: byId, changes: NO_CHANGE },
    security: mutSec,
    parameters: [{ $ref: REF.idPath }],
    responses: deleteResponses,
  });

  // ARCHIVE (split dari generik)
  addOp(`${byId}/archive`, "patch", {
    operationId: `archive${r.opPrefix}`,
    tags: [tag],
    summary: `Arsipkan ${r.singular}`,
    description: `Arsipkan ${r.singular}: \`previous_status\` = status saat ini, \`status\` = archived, \`archived_at\` = now. Sudah diarsip → 400 \`BAD_REQUEST\` "Konten ini sudah berada di arsip.".`,
    "x-module": r.module,
    "x-permission": perm,
    "x-rate-limit": "default",
    "x-cache-control": NO_STORE,
    "x-legacy": { method: "PATCH", path: "/api/v1/admin/{resource}/{id}/archive", split: true, changes: "Dipecah dari route generik /admin/{resource}/{id}/archive ke path eksplisit per resource (BC-05); tiap modul mendaftarkan route sendiri. Nama resource tak dikenal (legacy 400 `BAD_REQUEST` \"Menu konten tidak dikenal.\") kini 404 route." },
    security: mutSec,
    parameters: [{ $ref: REF.archiveIdPath }],
    responses: {
      "200": successData(schemaRef, { ...r.itemExample, status: "archived", previous_status: "published", archived_at: TS }, "Data berhasil diarsipkan."),
      "400": { $ref: REF.badRequest },
      "401": { $ref: REF.unauth },
      "403": { $ref: REF.forbidden },
      "404": { $ref: REF.notFound },
      "429": { $ref: REF.rateLimited },
    },
  });

  // UNARCHIVE (split)
  addOp(`${byId}/unarchive`, "patch", {
    operationId: `unarchive${r.opPrefix}`,
    tags: [tag],
    summary: `Batalkan arsip ${r.singular}`,
    description: "Kembalikan ke `previous_status` (bila null/archived → `draft`); `previous_status` & `archived_at` dikosongkan. Tidak sedang diarsip → 400 `BAD_REQUEST` \"Konten ini tidak berada di arsip.\".",
    "x-module": r.module,
    "x-permission": perm,
    "x-rate-limit": "default",
    "x-cache-control": NO_STORE,
    "x-legacy": { method: "PATCH", path: "/api/v1/admin/{resource}/{id}/unarchive", split: true, changes: "Dipecah dari route generik /admin/{resource}/{id}/unarchive ke path eksplisit per resource (BC-05). Nama resource tak dikenal (legacy 400 `BAD_REQUEST`) kini 404 route." },
    security: mutSec,
    parameters: [{ $ref: REF.archiveIdPath }],
    responses: {
      "200": successData(schemaRef, r.itemExample, "Arsip berhasil dibatalkan."),
      "400": { $ref: REF.badRequest },
      "401": { $ref: REF.unauth },
      "403": { $ref: REF.forbidden },
      "404": { $ref: REF.notFound },
      "429": { $ref: REF.rateLimited },
    },
  });
}

// Nama operasi list/reorder eksplisit agar unik & jelas
const listIdOverride = {
  "/api/v1/admin/hero": "listHeroSections",
  "/api/v1/admin/hero-slides": "listHeroSlides",
  "/api/v1/admin/partners": "listPartners",
  "/api/v1/admin/production-strengths": "listProductionStrengths",
  "/api/v1/admin/portfolio-categories": "listPortfolioCategories",
  "/api/v1/admin/portfolios": "listPortfolios",
  "/api/v1/admin/machines": "listMachines",
  "/api/v1/admin/printing-capacities": "listPrintingCapacities",
  "/api/v1/admin/production-capacities": "listProductionCapacities",
  "/api/v1/admin/services": "listServices",
  "/api/v1/admin/gallery-items": "listGalleryItems",
  "/api/v1/admin/news": "listNewsArticles",
};
const reorderOverride = {
  "/api/v1/admin/hero-slides/reorder": "reorderHeroSlides",
  "/api/v1/admin/partners/reorder": "reorderPartners",
  "/api/v1/admin/production-strengths/reorder": "reorderProductionStrengths",
  "/api/v1/admin/portfolio-categories/reorder": "reorderPortfolioCategories",
  "/api/v1/admin/portfolios/reorder": "reorderPortfolios",
  "/api/v1/admin/machines/reorder": "reorderMachines",
  "/api/v1/admin/printing-capacities/reorder": "reorderPrintingCapacities",
  "/api/v1/admin/production-capacities/reorder": "reorderProductionCapacities",
  "/api/v1/admin/services/reorder": "reorderServices",
  "/api/v1/admin/gallery-items/reorder": "reorderGalleryItems",
};
for (const [p, id] of Object.entries(listIdOverride)) {
  if (paths[p]?.get) paths[p].get.operationId = id;
}
for (const [p, id] of Object.entries(reorderOverride)) {
  if (paths[p]?.patch) paths[p].patch.operationId = id;
}

// SITE-SETTINGS (perm berbeda) — legacy getSiteSettings/updateSiteSettings (:133-250)
const siteExample = {
  id: 1, brand: "Indobraga", legal_name: "PT. Braga Indonesia Perkasa",
  email: "info@indobraga.com", phone: "022-123456", whatsapp: "6281200000001",
  instagram: "indobraga", contact_person: "Admin", contact_role: "Marketing",
  address: "Jl. Contoh No. 1, Bandung", seo_title: "Indobraga — Cetak Kemasan",
  seo_description: "Jasa cetak kemasan.", show_brand_text: false,
  logo_media_file_id: 10, logo_url: "https://media.indobraga.com/upload/prod/lainnya/2026-05-12/m10-large.webp",
  footer_logo_media_file_id: null, footer_logo_url: null,
  og_media_file_id: null, og_image_url: null,
  contact_hero_media_file_id: null, contact_hero_image_url: null,
  created_at: TS, updated_at: TS,
};
const trimmedString = { type: "string", description: "Di-trim." };
const settingsMedia = (label) => ({ type: ["integer", "null"], minimum: 1, description: `${label}. Wajib media \`completed\` (bila tidak → 400 \`UNPROCESSABLE_ENTITY\`); \`null\` mengosongkan.` });
addOp("/api/v1/admin/site-settings", "get", {
  operationId: "getSiteSettings",
  tags: ["settings"],
  summary: "Ambil pengaturan situs",
  description: "Pengaturan tunggal id=1. Baris belum ada → 404 `NOT_FOUND` \"Pengaturan website tidak ditemukan.\".",
  "x-module": "settings",
  "x-permission": "site_settings.manage",
  "x-rate-limit": "default",
  "x-cache-control": NO_STORE,
  "x-legacy": { method: "GET", path: "/api/v1/admin/site-settings", changes: NO_CHANGE },
  security: getSec,
  responses: {
    "200": successData("../components/schemas/content.yaml#/SiteSettings", siteExample),
    "401": { $ref: REF.unauth },
    "403": { $ref: REF.forbidden },
    "404": { $ref: REF.notFound },
    "429": { $ref: REF.rateLimited },
  },
});
addOp("/api/v1/admin/site-settings", "patch", {
  operationId: "updateSiteSettings",
  tags: ["settings"],
  summary: "Ubah pengaturan situs",
  description: "Ubah parsial (upsert id=1; bila baris belum ada dibuat dengan default legacy). Media rujukan tidak ada / belum `completed` → 400 `UNPROCESSABLE_ENTITY`. Mengembalikan pengaturan terbaru.",
  "x-module": "settings",
  "x-permission": "site_settings.manage",
  "x-rate-limit": "default",
  "x-cache-control": NO_STORE,
  "x-legacy": { method: "PATCH", path: "/api/v1/admin/site-settings", changes: NO_CHANGE },
  security: mutSec,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            brand: trimmedString,
            legal_name: trimmedString,
            email: { type: "string", format: "email", description: "Di-trim; `IsEmail`." },
            phone: trimmedString,
            whatsapp: trimmedString,
            instagram: trimmedString,
            contact_person: trimmedString,
            contact_role: trimmedString,
            address: trimmedString,
            seo_title: { type: ["string", "null"], description: "Di-trim; `null` mengosongkan." },
            seo_description: { type: ["string", "null"], description: "Di-trim; `null` mengosongkan." },
            show_brand_text: { type: "boolean" },
            logo_media_file_id: settingsMedia("Logo navbar"),
            footer_logo_media_file_id: settingsMedia("Logo footer"),
            og_media_file_id: settingsMedia("Gambar saat dibagikan (OG)"),
            contact_hero_media_file_id: settingsMedia("Gambar hero halaman kontak"),
          },
        },
        example: { brand: "Indobraga", phone: "022-123456", show_brand_text: false },
      },
    },
  },
  responses: {
    "200": successData("../components/schemas/content.yaml#/SiteSettings", siteExample, "Pengaturan berhasil diubah."),
    "400": { $ref: REF.mediaNotReady },
    "401": { $ref: REF.unauth },
    "403": { $ref: REF.forbidden },
    "429": { $ref: REF.rateLimited },
  },
});

const header = "# FILE GENERATED oleh scripts/build-content-paths.mjs — jangan diedit manual.\n";
writeFileSync(outPath, header + YAML.stringify(paths, { lineWidth: 0 }));
const opCount = Object.values(paths).reduce((n, item) => n + Object.keys(item).length, 0);
console.log(`${opCount} operasi admin-content → src/paths/admin-content.yaml (${Object.keys(paths).length} path)`);
