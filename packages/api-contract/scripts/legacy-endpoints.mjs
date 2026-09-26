#!/usr/bin/env node
// Memindai controller NestJS legacy dan menulis snapshot daftar endpoint ke
// legacy/legacy-endpoints.json. Snapshot di-commit karena repo legacy tidak tersedia di CI;
// check-mapping.mjs memakainya untuk memastikan setiap endpoint legacy punya operasi di kontrak.
//
// Pemakaian: node scripts/legacy-endpoints.mjs [path-ke-legacy/apps/api/src]
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const pkgDir = join(here, "..");
const legacySrc = process.argv[2] ?? join(pkgDir, "..", "..", "..", "indobraga", "apps", "api", "src");

// Path yang dikecualikan dari global prefix `api/v1` (legacy src/main.ts).
const PREFIX_EXCLUDED = new Set(["/robots.txt", "/sitemap.xml"]);
const GLOBAL_PREFIX = "/api/v1";

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return walk(p);
    return name.endsWith(".controller.ts") ? [p] : [];
  });
}

const firstStringArg = (args) => {
  const m = args.match(/^\s*["'`]([^"'`]*)["'`]/) ?? args.match(/path\s*:\s*["'`]([^"'`]*)["'`]/);
  return m ? m[1] : "";
};

const joinPath = (...parts) =>
  "/" + parts.map((p) => p.replace(/^\/+|\/+$/g, "")).filter(Boolean).join("/");

const endpoints = [];
for (const file of walk(legacySrc)) {
  const src = readFileSync(file, "utf8");
  const ctrl = src.match(/@Controller\(([^)]*)\)/);
  if (!ctrl) continue;
  const base = firstStringArg(ctrl[1]);
  const re = /@(Get|Post|Patch|Put|Delete|Sse)\(([^)]*)\)/g;
  let m;
  while ((m = re.exec(src))) {
    const method = m[1] === "Sse" ? "GET" : m[1].toUpperCase();
    const local = joinPath(base, firstStringArg(m[2]));
    const path = PREFIX_EXCLUDED.has(local) ? local : joinPath(GLOBAL_PREFIX, local);
    // Normalisasi parameter Nest `:id` → gaya OpenAPI `{id}`.
    const openapiPath = path.replace(/:([A-Za-z0-9_]+)/g, "{$1}");
    const line = src.slice(0, m.index).split("\n").length;
    endpoints.push({
      method,
      path: openapiPath,
      source: `${relative(legacySrc, file).replace(/\\/g, "/")}:${line}`,
    });
  }
}

endpoints.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
const outDir = join(pkgDir, "legacy");
mkdirSync(outDir, { recursive: true });
writeFileSync(
  join(outDir, "legacy-endpoints.json"),
  JSON.stringify({ generated_from: "indobraga/apps/api/src (NestJS legacy)", count: endpoints.length, endpoints }, null, 2) + "\n",
);
console.log(`${endpoints.length} endpoint legacy → legacy/legacy-endpoints.json`);
