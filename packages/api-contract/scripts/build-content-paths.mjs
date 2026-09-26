#!/usr/bin/env node
// Generator 12 resource admin-content (PLAN-01 §1.6).
// Output: src/paths/admin-content.yaml (di-commit).
// 86 endpoint legacy dipetakan ke 108 operasi v1 (2 route generik dipecah ke 24 path eksplisit).
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

const REF = {
  successBase: "../components/schemas/envelope.yaml#/SuccessBase",
  pagination: "../components/schemas/envelope.yaml#/PaginationMeta",
  contentStatusUpdate: "../components/schemas/content.yaml#/ContentStatusUpdate",
  reorderInput: "../components/schemas/content.yaml#/ReorderInput",
  reorderResult: "../components/schemas/content.yaml#/ReorderResult",
  deleteResult: "../components/schemas/content.yaml#/ContentDeleteResult",
  idPath: "../components/parameters.yaml#/IdPath",
  badRequest: "../components/responses.yaml#/BadRequest",
  validation: "../components/responses.yaml#/ValidationError",
  unauth: "../components/responses.yaml#/Unauthenticated",
  forbidden: "../components/responses.yaml#/Forbidden",
  notFound: "../components/responses.yaml#/NotFound",
  conflict: "../components/responses.yaml#/Conflict",
  unprocessable: "../components/responses.yaml#/Unprocessable",
  rateLimited: "../components/responses.yaml#/RateLimited",
  xRequestId: "../components/headers.yaml#/XRequestId",
};

const FIELD_DEFS = {
  title: { type: "string", examples: ["Contoh Judul"] },
  name: { type: "string", examples: ["Contoh Nama"] },
  slug: { type: "string", pattern: "^[a-z0-9]+(-[a-z0-9]+)*$", maxLength: 190, examples: ["contoh-slug"] },
  subtitle: { type: "string", examples: ["Subjudul contoh"] },
  cta_label: { type: "string", examples: ["Hubungi Kami"] },
  cta_href: { type: "string", examples: ["/kontak"] },
  label: { type: "string", examples: ["Label Contoh"] },
  metric: { type: "string", examples: ["10.000+ pcs/hari"] },
  value: { type: "string", examples: ["50.000"] },
  suffix: { type: "string", examples: ["pcs"] },
  segment: { type: "string", examples: ["FMCG"] },
  category: { type: "string", examples: ["Tips"] },
  category_id: { type: "integer", minimum: 1, examples: [2] },
  short_description: { type: "string", examples: ["Deskripsi singkat."] },
  description: { type: "string", examples: ["Deskripsi lengkap."] },
  alt_text: { type: "string" },
  caption: { type: "string", examples: ["Keterangan contoh"] },
  excerpt: { type: "string", examples: ["Ringkasan singkat."] },
  content: { type: "array", items: { type: "string" } },
  product: { type: "string", examples: ["Kardus Box"] },
  unit: { type: "string", examples: ["pcs/bulan"] },
  hero_section_id: { type: "integer", minimum: 0, description: "0 = ikut hero pertama.", examples: [1] },
  media_file_id: { type: "integer", minimum: 1, examples: [10] },
  media_file_ids: { type: "array", maxItems: 10, items: { type: "integer", minimum: 1 }, examples: [[10, 11]] },
  logo_media_id: { type: "integer", minimum: 1, examples: [10] },
  poster_media_id: { type: "integer", minimum: 1 },
  thumbnail_media_file_id: { type: "integer", minimum: 1, examples: [10] },
  og_image_media_file_id: { type: "integer", minimum: 1 },
  media_type: { type: "string", enum: ["image", "video"], examples: ["image"] },
  is_featured: { type: "boolean", examples: [false] },
  sort_order: { type: "integer", minimum: 0, maximum: 1000000, examples: [1] },
  status: { $ref: "../components/schemas/common.yaml#/WritableContentStatus" },
  published_at: { type: "string", format: "date-time", examples: [TS] },
  seo_title: { type: "string" },
  seo_description: { type: "string" },
};

function reqSchema(fieldNames, required) {
  const properties = {};
  for (const f of fieldNames) properties[f] = FIELD_DEFS[f];
  return { type: "object", additionalProperties: false, ...(required.length ? { required } : {}), properties };
}

function successData(schemaRef, exampleData, message = "Data berhasil diambil.") {
  return {
    description: "Berhasil.",
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

function listParams() {
  return [
    { name: "page", in: "query", required: false, description: "Halaman (mulai 1). Nilai tidak valid → 1.", schema: { type: "integer", minimum: 1, default: 1 } },
    { name: "limit", in: "query", required: false, description: "Batas per halaman.", schema: { type: "integer", minimum: 1, default: 10, maximum: 100 } },
    { name: "q", in: "query", required: false, description: "Kata kunci pencarian.", schema: { type: "string" } },
    { name: "status", in: "query", required: false, description: "Filter status (arsip disembunyikan kecuali diminta).", schema: { type: "string", enum: ["draft", "published", "inactive", "archived"] } },
    { name: "category", in: "query", required: false, schema: { type: "string" } },
    { name: "segment", in: "query", required: false, schema: { type: "string" } },
    { name: "type", in: "query", required: false, description: "Filter tipe media (galeri).", schema: { type: "string", enum: ["image", "video"] } },
  ];
}

const RESOURCES = [
  {
    key: "hero", schema: "HeroSection", module: "profile", opPrefix: "Hero",
    singular: "hero", hasReorder: false, writable: ["title", "subtitle", "cta_label", "cta_href", "status"],
    requiredCreate: ["title"],
    itemExample: { id: 1, title: "Jasa Cetak Kardus & Packaging", subtitle: "Sejak 2010.", cta_label: "Hubungi Kami", cta_href: "/kontak", status: "published", previous_status: null, archived_at: null, created_at: TS, updated_at: TS },
    createExample: { title: "Jasa Cetak Kardus & Packaging", subtitle: "Sejak 2010." },
  },
  {
    key: "hero-slides", schema: "HeroSlide", module: "profile", opPrefix: "HeroSlide",
    singular: "slide hero", hasReorder: true, writable: ["hero_section_id", "label", "title", "metric", "alt_text", "media_file_id", "sort_order", "status"],
    requiredCreate: ["title"],
    itemExample: { id: 1, hero_section_id: 1, label: "Terpercaya", title: "Cetak Offset Berkualitas", metric: "10.000+ pcs/hari", alt_text: "Mesin cetak", media_file_id: 10, sort_order: 1, status: "published", previous_status: null, archived_at: null, created_at: TS, updated_at: TS },
    createExample: { title: "Cetak Offset Berkualitas", label: "Terpercaya", hero_section_id: 1, media_file_id: 10, sort_order: 1 },
  },
  {
    key: "partners", schema: "Partner", module: "profile", opPrefix: "Partner",
    singular: "partner", hasReorder: true, writable: ["name", "segment", "logo_media_id", "sort_order", "status"],
    requiredCreate: ["name"],
    itemExample: { id: 1, name: "PT Maju Bersama", segment: "FMCG", logo_media_id: 10, sort_order: 1, status: "published", previous_status: null, archived_at: null, created_at: TS, updated_at: TS },
    createExample: { name: "PT Maju Bersama", segment: "FMCG", logo_media_id: 10 },
  },
  {
    key: "production-strengths", schema: "ProductionStrength", module: "profile", opPrefix: "ProductionStrength",
    singular: "keunggulan produksi", hasReorder: true, writable: ["label", "value", "suffix", "sort_order", "status"],
    requiredCreate: ["label", "value"],
    itemExample: { id: 1, label: "Kapasitas Harian", value: "50.000", suffix: "pcs", sort_order: 1, status: "published", previous_status: null, archived_at: null, created_at: TS, updated_at: TS },
    createExample: { label: "Kapasitas Harian", value: "50.000", suffix: "pcs" },
  },
  {
    key: "portfolio-categories", schema: "PortfolioCategory", module: "portfolio", opPrefix: "PortfolioCategory",
    singular: "kategori portofolio", hasReorder: true, writable: ["name", "slug", "sort_order", "status"],
    requiredCreate: ["name"],
    itemExample: { id: 1, name: "Box & Karton", slug: "box-karton", sort_order: 1, status: "published", previous_status: null, archived_at: null, created_at: TS, updated_at: TS },
    createExample: { name: "Box & Karton" },
    deleteConflict: "Hapus kategori yang masih dipakai portofolio → 409.",
  },
  {
    key: "portfolios", schema: "Portfolio", module: "portfolio", opPrefix: "Portfolio",
    singular: "portofolio", hasReorder: true,
    writable: ["title", "slug", "category_id", "short_description", "description", "media_file_ids", "media_file_id", "is_featured", "sort_order", "status", "published_at", "seo_title", "seo_description"],
    requiredCreate: ["title", "category_id"],
    itemExample: { id: 1, title: "Kemasan Kopi Premium", slug: "kemasan-kopi-premium", category_id: 2, category: "Box & Karton", short_description: "Kemasan kopi 250gr.", is_featured: true, sort_order: 1, status: "published", previous_status: null, published_at: TS, archived_at: null, created_at: TS, updated_at: TS },
    createExample: { title: "Kemasan Kopi Premium", category_id: 2, short_description: "Kemasan kopi 250gr.", media_file_ids: [10, 11], is_featured: true },
    publishNote: "Publish butuh ≥1 gambar dan kategori PUBLISHED (422 bila tidak).",
  },
  {
    key: "machines", schema: "Machine", module: "profile", opPrefix: "Machine",
    singular: "mesin", hasReorder: true, writable: ["name", "slug", "metric", "description", "media_file_id", "sort_order", "status"],
    requiredCreate: ["name"],
    itemExample: { id: 1, name: "Heidelberg Speedmaster", slug: "heidelberg-speedmaster", metric: "18.000 lbr/jam", description: "Mesin offset 4 warna.", media_file_id: 10, sort_order: 1, status: "published", previous_status: null, archived_at: null, created_at: TS, updated_at: TS },
    createExample: { name: "Heidelberg Speedmaster", metric: "18.000 lbr/jam", media_file_id: 10 },
  },
  {
    key: "printing-capacities", schema: "PrintingCapacity", module: "profile", opPrefix: "PrintingCapacity",
    singular: "kapasitas cetak", hasReorder: true, writable: ["label", "value", "unit", "description", "media_file_id", "sort_order", "status"],
    requiredCreate: ["label", "value", "unit"],
    itemExample: { id: 1, label: "Offset Printing", value: "50.000", unit: "lembar/hari", description: "Cetak offset hingga B1.", media_file_id: 10, sort_order: 1, status: "published", previous_status: null, archived_at: null, created_at: TS, updated_at: TS },
    createExample: { label: "Offset Printing", value: "50.000", unit: "lembar/hari" },
  },
  {
    key: "production-capacities", schema: "ProductionCapacity", module: "profile", opPrefix: "ProductionCapacity",
    singular: "kapasitas produksi", hasReorder: true, writable: ["product", "value", "unit", "sort_order", "status"],
    requiredCreate: ["product", "value", "unit"],
    itemExample: { id: 1, product: "Kardus Box", value: "100.000", unit: "pcs/bulan", sort_order: 1, status: "published", previous_status: null, archived_at: null, created_at: TS, updated_at: TS },
    createExample: { product: "Kardus Box", value: "100.000", unit: "pcs/bulan" },
  },
  {
    key: "services", schema: "ServiceItem", module: "profile", opPrefix: "Service",
    singular: "layanan", hasReorder: true, writable: ["name", "sort_order", "status"],
    requiredCreate: ["name"],
    itemExample: { id: 1, name: "Desain Kemasan", sort_order: 1, status: "published", previous_status: null, archived_at: null, created_at: TS, updated_at: TS },
    createExample: { name: "Desain Kemasan" },
  },
  {
    key: "gallery-items", schema: "GalleryItem", module: "gallery", opPrefix: "GalleryItem",
    singular: "item galeri", hasReorder: true, writable: ["media_file_id", "media_type", "caption", "poster_media_id", "sort_order", "status", "published_at"],
    requiredCreate: ["media_file_id", "media_type", "caption"],
    itemExample: { id: 1, media_file_id: 10, media_type: "image", caption: "Proses cetak offset", sort_order: 1, status: "published", previous_status: null, published_at: TS, archived_at: null, created_at: TS, updated_at: TS },
    createExample: { media_file_id: 10, media_type: "image", caption: "Proses cetak offset" },
  },
  {
    key: "news", schema: "NewsArticle", module: "news", opPrefix: "News",
    singular: "berita", hasReorder: false,
    writable: ["title", "slug", "category", "excerpt", "content", "thumbnail_media_file_id", "og_image_media_file_id", "status", "published_at", "seo_title", "seo_description", "sort_order"],
    requiredCreate: ["title", "category", "excerpt"],
    itemExample: { id: 1, title: "Tips Memilih Kemasan", slug: "tips-memilih-kemasan", category: "Tips", excerpt: "Ringkasan singkat.", content: ["Paragraf 1.", "Paragraf 2."], sort_order: 0, status: "published", previous_status: null, published_at: TS, archived_at: null, created_at: TS, updated_at: TS },
    createExample: { title: "Tips Memilih Kemasan", category: "Tips", excerpt: "Ringkasan singkat.", content: ["Paragraf 1."] },
    publishNote: "Publish butuh konten non-kosong (422 bila kosong).",
  },
];

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
  const tag = r.module;
  const perm = "content.manage";

  // LIST
  addOp(base, "get", {
    operationId: `list${r.opPrefix}s`.replace(/ss$/, "s").replace(/ys$/, "ies"),
    tags: [tag],
    summary: `Daftar ${r.singular}`,
    description: `List offset (page/limit default 10 maks 100, q, status, category, segment, type). Arsip disembunyikan kecuali status diminta.${r.publishNote ? " " + r.publishNote : ""}`,
    "x-module": r.module,
    "x-permission": perm,
    "x-rate-limit": "default",
    "x-cache-control": NO_STORE,
    "x-legacy": { method: "GET", path: base, changes: "Tidak ada perubahan bentuk data selain envelope v1." },
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
  addOp(base, "post", {
    operationId: `create${r.opPrefix}`,
    tags: [tag],
    summary: `Buat ${r.singular}`,
    description: `Buat ${r.singular} baru. Status default draft (kategori portofolio default published). Media rujukan wajib COMPLETED (422 bila tidak).${r.publishNote ? " " + r.publishNote : ""}`,
    "x-module": r.module,
    "x-permission": perm,
    "x-rate-limit": "default",
    "x-cache-control": NO_STORE,
    "x-legacy": { method: "POST", path: base, changes: "Tidak ada perubahan bentuk data selain envelope v1; field wajib sesuai backend.md." },
    security: mutSec,
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: reqSchema(r.writable, r.requiredCreate),
          example: r.createExample,
        },
      },
    },
    responses: {
      "200": successData(schemaRef, r.itemExample, "Data berhasil dibuat."),
      "400": { $ref: REF.validation },
      "401": { $ref: REF.unauth },
      "403": { $ref: REF.forbidden },
      "409": { $ref: REF.conflict },
      "422": { $ref: REF.unprocessable },
      "429": { $ref: REF.rateLimited },
    },
  });

  // REORDER (sebelum {id} agar eksplisit; path berbeda sehingga tidak konflik)
  if (r.hasReorder) {
    addOp(`${base}/reorder`, "patch", {
      operationId: `reorder${r.opPrefix}s`,
      tags: [tag],
      summary: `Urutkan ${r.singular}`,
      description: `Urutkan ${r.singular} dalam satu transaksi (items min 1).`,
      "x-module": r.module,
      "x-permission": perm,
      "x-rate-limit": "default",
      "x-cache-control": NO_STORE,
      "x-legacy": { method: "PATCH", path: `${base}/reorder`, changes: "Tidak ada perubahan bentuk data selain envelope v1." },
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
        "404": { $ref: REF.notFound },
        "429": { $ref: REF.rateLimited },
      },
    });
  }

  // DETAIL
  addOp(byId, "get", {
    operationId: `get${r.opPrefix}`,
    tags: [tag],
    summary: `Detail ${r.singular}`,
    description: `Detail ${r.singular} termasuk pratinjau media tersemat.${r.key === "hero" ? " Termasuk slides[]." : ""}`,
    "x-module": r.module,
    "x-permission": perm,
    "x-rate-limit": "default",
    "x-cache-control": NO_STORE,
    "x-legacy": { method: "GET", path: byId, changes: "Tidak ada perubahan bentuk data selain envelope v1; media disematkan sebagai MediaPreview." },
    security: getSec,
    parameters: [{ $ref: REF.idPath }],
    responses: {
      "200": successData(schemaRef, r.itemExample),
      "400": { $ref: REF.badRequest },
      "401": { $ref: REF.unauth },
      "403": { $ref: REF.forbidden },
      "404": { $ref: REF.notFound },
      "429": { $ref: REF.rateLimited },
    },
  });

  // UPDATE
  addOp(byId, "patch", {
    operationId: `update${r.opPrefix}`,
    tags: [tag],
    summary: `Ubah ${r.singular}`,
    description: `Ubah parsial ${r.singular}; galeri portofolio diganti atomik hanya bila dikirim. Mengembalikan item + MediaPreview.`,
    "x-module": r.module,
    "x-permission": perm,
    "x-rate-limit": "default",
    "x-cache-control": NO_STORE,
    "x-legacy": { method: "PATCH", path: byId, changes: "Tidak ada perubahan bentuk data selain envelope v1." },
    security: mutSec,
    parameters: [{ $ref: REF.idPath }],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: reqSchema(r.writable, []),
          example: r.createExample,
        },
      },
    },
    responses: {
      "200": successData(schemaRef, r.itemExample, "Data berhasil diubah."),
      "400": { $ref: REF.validation },
      "401": { $ref: REF.unauth },
      "403": { $ref: REF.forbidden },
      "404": { $ref: REF.notFound },
      "409": { $ref: REF.conflict },
      "422": { $ref: REF.unprocessable },
      "429": { $ref: REF.rateLimited },
    },
  });

  // STATUS
  addOp(`${byId}/status`, "patch", {
    operationId: `update${r.opPrefix}Status`,
    tags: [tag],
    summary: `Ubah status ${r.singular}`,
    description: `Ubah status (draft|published|inactive).${r.publishNote ? " " + r.publishNote : ""} published_at di-clamp ke now bila di masa depan; ditulis now saat publish (portofolio, galeri, berita).`,
    "x-module": r.module,
    "x-permission": perm,
    "x-rate-limit": "default",
    "x-cache-control": NO_STORE,
    "x-legacy": { method: "PATCH", path: `${byId}/status`, changes: "Tidak ada perubahan bentuk data selain envelope v1." },
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
    responses: {
      "200": successData(schemaRef, r.itemExample, "Status berhasil diubah."),
      "400": { $ref: REF.validation },
      "401": { $ref: REF.unauth },
      "403": { $ref: REF.forbidden },
      "404": { $ref: REF.notFound },
      "422": { $ref: REF.unprocessable },
      "429": { $ref: REF.rateLimited },
    },
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
    "400": { $ref: REF.badRequest },
    "401": { $ref: REF.unauth },
    "403": { $ref: REF.forbidden },
    "404": { $ref: REF.notFound },
    "409": { $ref: REF.conflict },
    "429": { $ref: REF.rateLimited },
  };
  if (r.key === "portfolio-categories") {
    deleteResponses["409"].description = undefined;
  }
  addOp(byId, "delete", {
    operationId: `delete${r.opPrefix}`,
    tags: [tag],
    summary: `Hapus permanen ${r.singular}`,
    description: `Hapus permanen ${r.singular} + media tak terpakai (cleanup_failed_media_count).${r.deleteConflict ? " " + r.deleteConflict : ""}`,
    "x-module": r.module,
    "x-permission": perm,
    "x-rate-limit": "default",
    "x-cache-control": NO_STORE,
    "x-legacy": { method: "DELETE", path: byId, changes: "Tidak ada perubahan bentuk data selain envelope v1." },
    security: mutSec,
    parameters: [{ $ref: REF.idPath }],
    responses: deleteResponses,
  });

  // ARCHIVE (split dari generik)
  addOp(`${byId}/archive`, "patch", {
    operationId: `archive${r.opPrefix}`,
    tags: [tag],
    summary: `Arsipkan ${r.singular}`,
    description: `Arsipkan ${r.singular}. Gagal 400 bila sudah diarsip.`,
    "x-module": r.module,
    "x-permission": perm,
    "x-rate-limit": "default",
    "x-cache-control": NO_STORE,
    "x-legacy": { method: "PATCH", path: "/api/v1/admin/{resource}/{id}/archive", split: true, changes: "Dipecah dari route generik /admin/{resource}/{id}/archive ke path eksplisit per resource (BC-05); tiap modul mendaftarkan route sendiri." },
    security: mutSec,
    parameters: [{ $ref: REF.idPath }],
    responses: {
      "200": successData(schemaRef, r.itemExample, "Data berhasil diarsipkan."),
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
    description: `Kembalikan dari arsip ke previous_status atau draft.`,
    "x-module": r.module,
    "x-permission": perm,
    "x-rate-limit": "default",
    "x-cache-control": NO_STORE,
    "x-legacy": { method: "PATCH", path: "/api/v1/admin/{resource}/{id}/unarchive", split: true, changes: "Dipecah dari route generik /admin/{resource}/{id}/unarchive ke path eksplisit per resource (BC-05)." },
    security: mutSec,
    parameters: [{ $ref: REF.idPath }],
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

// Perbaiki operationId list yang jamak tidak beraturan
function fixListIds() {
  const fixes = {
    listHeros: "listHeroSections",
    listCategorys: "listPortfolioCategories",
  };
  for (const [p, item] of Object.entries(paths)) {
    for (const [m, op] of Object.entries(item)) {
      if (fixes[op.operationId]) op.operationId = fixes[op.operationId];
    }
  }
}
// Nama list eksplisit agar unik & jelas
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
fixListIds();

// SITE-SETTINGS (perm berbeda)
const siteExample = {
  id: 1, brand: "Indobraga", legal_name: "PT. Braga Indonesia Perkasa",
  email: "info@indobraga.com", phone: "022-123456", whatsapp: "6281200000001",
  instagram: "@indobraga", contact_person: "Admin", contact_role: "Marketing",
  address: "Jl. Contoh No. 1, Bandung", seo_title: "Indobraga — Cetak Kemasan",
  seo_description: "Jasa cetak kemasan.", show_brand_text: false,
  logo_url: "https://media.indobraga.com/upload/prod/logo/large.webp",
  footer_logo_url: null, og_image_url: null, contact_hero_image_url: null,
  created_at: TS, updated_at: TS,
};
addOp("/api/v1/admin/site-settings", "get", {
  operationId: "getSiteSettings",
  tags: ["settings"],
  summary: "Ambil pengaturan situs",
  description: "Pengaturan tunggal id=1 termasuk logo_url dkk.",
  "x-module": "settings",
  "x-permission": "site_settings.manage",
  "x-rate-limit": "default",
  "x-cache-control": NO_STORE,
  "x-legacy": { method: "GET", path: "/api/v1/admin/site-settings", changes: "Tidak ada perubahan bentuk data selain envelope v1." },
  security: getSec,
  responses: {
    "200": successData("../components/schemas/content.yaml#/SiteSettings", siteExample),
    "401": { $ref: REF.unauth },
    "403": { $ref: REF.forbidden },
    "429": { $ref: REF.rateLimited },
  },
});
addOp("/api/v1/admin/site-settings", "patch", {
  operationId: "updateSiteSettings",
  tags: ["settings"],
  summary: "Ubah pengaturan situs",
  description: "Ubah parsial pengaturan situs; media rujukan wajib COMPLETED.",
  "x-module": "settings",
  "x-permission": "site_settings.manage",
  "x-rate-limit": "default",
  "x-cache-control": NO_STORE,
  "x-legacy": { method: "PATCH", path: "/api/v1/admin/site-settings", changes: "Tidak ada perubahan bentuk data selain envelope v1." },
  security: mutSec,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            brand: { type: "string" },
            legal_name: { type: "string" },
            email: { type: "string", format: "email" },
            phone: { type: "string" },
            whatsapp: { type: "string" },
            instagram: { type: "string" },
            contact_person: { type: "string" },
            contact_role: { type: "string" },
            address: { type: "string" },
            seo_title: { type: "string" },
            seo_description: { type: "string" },
            show_brand_text: { type: "boolean" },
            logo_media_file_id: { type: "integer", minimum: 1 },
            footer_logo_media_file_id: { type: "integer", minimum: 1 },
            og_media_file_id: { type: "integer", minimum: 1 },
            contact_hero_media_file_id: { type: "integer", minimum: 1 },
          },
        },
        example: { brand: "Indobraga", phone: "022-123456", show_brand_text: false },
      },
    },
  },
  responses: {
    "200": successData("../components/schemas/content.yaml#/SiteSettings", siteExample, "Pengaturan berhasil diubah."),
    "400": { $ref: REF.validation },
    "401": { $ref: REF.unauth },
    "403": { $ref: REF.forbidden },
    "422": { $ref: REF.unprocessable },
    "429": { $ref: REF.rateLimited },
  },
});

const header = "# FILE GENERATED oleh scripts/build-content-paths.mjs — jangan diedit manual.\n";
writeFileSync(outPath, header + YAML.stringify(paths, { lineWidth: 0 }));
const opCount = Object.values(paths).reduce((n, item) => n + Object.keys(item).length, 0);
console.log(`${opCount} operasi admin-content → src/paths/admin-content.yaml (${Object.keys(paths).length} path)`);
