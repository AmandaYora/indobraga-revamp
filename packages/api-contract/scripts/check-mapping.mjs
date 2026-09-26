#!/usr/bin/env node
// Gerbang cakupan kontrak (PLAN-01 §1.6):
//  1. setiap endpoint legacy (legacy/legacy-endpoints.json, 160 buah) dipetakan TEPAT SATU
//     operasi v1 lewat ekstensi `x-legacy: { method, path, changes }`;
//  2. operationId unik, `x-module` valid, ekstensi wajib ada;
//  3. menulis ulang LEGACY_MAPPING.md dari kontrak (CI memastikan tidak ada diff).
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const spec = YAML.parse(readFileSync(join(pkgDir, "openapi.yaml"), "utf8"));
const legacy = JSON.parse(readFileSync(join(pkgDir, "legacy", "legacy-endpoints.json"), "utf8"));

const MODULES = [
  "auth", "users", "audit", "media", "settings", "profile", "portfolio", "gallery", "news", "site",
  "leads", "audience", "notifications", "emailaccounts", "emailtemplates", "campaigns", "dashboard", "health",
];
const REQUIRED_EXT = ["x-module", "x-permission", "x-rate-limit", "x-cache-control", "x-legacy"];
const METHODS = ["get", "post", "put", "patch", "delete"];

const problems = [];
const ops = [];
const seenIds = new Map();
for (const [path, item] of Object.entries(spec.paths ?? {})) {
  for (const m of METHODS) {
    const op = item[m];
    if (!op) continue;
    const where = `${m.toUpperCase()} ${path}`;
    for (const ext of REQUIRED_EXT) if (!(ext in op)) problems.push(`${where}: ekstensi ${ext} tidak ada`);
    if (!op.operationId) problems.push(`${where}: operationId tidak ada`);
    else if (seenIds.has(op.operationId)) problems.push(`${where}: operationId "${op.operationId}" duplikat dengan ${seenIds.get(op.operationId)}`);
    else seenIds.set(op.operationId, where);
    if (op["x-module"] && !MODULES.includes(op["x-module"])) problems.push(`${where}: x-module "${op["x-module"]}" tidak dikenal`);
    ops.push({ method: m.toUpperCase(), path, op });
  }
}

const key = (method, path) => `${method.toUpperCase()} ${path}`;
// Satu endpoint legacy boleh dipecah ke beberapa operasi v1 (mis. route generik
// `/admin/{resource}/{id}/archive` → path eksplisit per resource) HANYA bila semua operasi
// pecahannya menandai `x-legacy.split: true`.
const byLegacy = new Map(); // key → operasi[]
for (const o of ops) {
  const lg = o.op["x-legacy"];
  if (!lg) continue;
  if (!lg.method || !lg.path) {
    problems.push(`${o.method} ${o.path}: x-legacy wajib punya method & path (atau null)`);
    continue;
  }
  const k = key(lg.method, lg.path);
  const list = byLegacy.get(k) ?? [];
  list.push(o);
  byLegacy.set(k, list);
}
for (const [k, list] of byLegacy) {
  if (list.length > 1 && !list.every((o) => o.op["x-legacy"].split === true)) {
    problems.push(`legacy ${k} dipetakan ke ${list.length} operasi (${list.map((o) => o.op.operationId).join(", ")}) tanpa x-legacy.split: true di semuanya`);
  }
}
const legacyKeys = new Set(legacy.endpoints.map((e) => key(e.method, e.path)));
for (const e of legacy.endpoints) if (!byLegacy.has(key(e.method, e.path))) problems.push(`legacy ${key(e.method, e.path)} (${e.source}) belum dipetakan`);
for (const k of byLegacy.keys()) if (!legacyKeys.has(k)) problems.push(`x-legacy ${k} tidak ada di snapshot legacy`);

// --- LEGACY_MAPPING.md ---------------------------------------------------------------
const esc = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
const rows = legacy.endpoints.map((e, i) => {
  const list = byLegacy.get(key(e.method, e.path)) ?? [];
  if (list.length === 0) return `| ${i + 1} | \`${e.method} ${e.path}\` | \`${e.source}\` | **BELUM** | | | |`;
  const ids = list.map((o) => `\`${o.op.operationId}\``).join("<br>");
  const paths = list.map((o) => `\`${o.method} ${o.path}\``).join("<br>");
  const modules = [...new Set(list.map((o) => o.op["x-module"]))].join(", ");
  const changes = [...new Set(list.map((o) => o.op["x-legacy"].changes ?? ""))].map(esc).join(" ");
  return `| ${i + 1} | \`${e.method} ${e.path}\` | \`${e.source}\` | ${ids} | ${paths} | ${modules} | ${changes} |`;
});
const added = ops.filter((o) => !o.op["x-legacy"]);
const md = [
  "# Pemetaan Endpoint Legacy → Kontrak v1",
  "",
  "> FILE GENERATED oleh `scripts/check-mapping.mjs` dari `openapi.yaml` + `legacy/legacy-endpoints.json`. Jangan diedit manual.",
  "",
  `Legacy: **${legacy.endpoints.length}** endpoint · terpetakan: **${byLegacy.size}** · operasi v1: **${ops.length}** (${added.length} baru).`,
  "",
  "Perubahan global yang berlaku untuk semua endpoint (ADR-0004) tidak diulang per baris: envelope sukses menjadi `{success, message, data}`; list offset `data: [...]` + `meta: {page, limit, total, total_pages}` (legacy `data: {items, pagination}`); list cursor `data: [...]` + `meta: {limit, next_cursor, has_more}`; error `{success:false, code, message, errors[], request_id}` (legacy `error: {code, message, details}` + `meta`).",
  "",
  "| # | Legacy | Sumber legacy | operationId v1 | Method & path v1 | Modul | Perubahan spesifik |",
  "|---|---|---|---|---|---|---|",
  ...rows,
  "",
  "## Operasi baru (tanpa padanan legacy)",
  "",
  "| operationId | Method & path | Modul | Keterangan |",
  "|---|---|---|---|",
  ...added.map((o) => `| \`${o.op.operationId}\` | \`${o.method} ${o.path}\` | ${o.op["x-module"]} | ${esc(o.op.summary)} |`),
  "",
].join("\n");
writeFileSync(join(pkgDir, "LEGACY_MAPPING.md"), md);

if (problems.length) {
  console.error(`✗ ${problems.length} masalah kontrak:\n` + problems.map((p) => `  - ${p}`).join("\n"));
  process.exit(1);
}
console.log(`✓ ${byLegacy.size}/${legacy.endpoints.length} endpoint legacy terpetakan, ${ops.length} operasi, LEGACY_MAPPING.md diperbarui.`);
