#!/usr/bin/env node
// Merakit root OpenAPI dari openapi.base.yaml + semua fragmen src/paths/*.yaml.
// Setiap fragmen berisi map `<path lengkap>: <path item>`; root berisi $ref ke fragmen
// (JSON Pointer) sehingga $ref relatif di dalam fragmen tetap valid saat di-bundle Redocly.
//
//   node scripts/assemble.mjs                    → src/openapi.yaml (semua fragmen)
//   node scripts/assemble.mjs --only a.yaml ...  → src/.fragment-<nama>.yaml (validasi fragmen)
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const srcDir = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
const pathsDir = join(srcDir, "paths");

const argv = process.argv.slice(2);
const onlyIdx = argv.indexOf("--only");
const only = onlyIdx >= 0 ? argv.slice(onlyIdx + 1).map((f) => basename(f)) : null;

const files = (existsSync(pathsDir) ? readdirSync(pathsDir) : [])
  .filter((f) => f.endsWith(".yaml"))
  .filter((f) => !only || only.includes(f))
  .sort();

if (only && files.length !== only.length) {
  console.error(`Fragmen tidak ditemukan: ${only.filter((f) => !files.includes(f)).join(", ")}`);
  process.exit(1);
}

// JSON Pointer (RFC 6901) di dalam fragment URI: ~ → ~0, / → ~1, lalu percent-encode.
const pointer = (key) => "#/" + encodeURIComponent(key.replace(/~/g, "~0").replace(/\//g, "~1"));

const root = YAML.parse(readFileSync(join(srcDir, "openapi.base.yaml"), "utf8"));
const paths = {};
const owner = {};
for (const file of files) {
  const doc = YAML.parse(readFileSync(join(pathsDir, file), "utf8")) ?? {};
  for (const key of Object.keys(doc)) {
    if (!key.startsWith("/")) {
      console.error(`${file}: key "${key}" bukan path (harus diawali "/").`);
      process.exit(1);
    }
    if (paths[key]) {
      console.error(`Path duplikat "${key}" di ${owner[key]} dan ${file}.`);
      process.exit(1);
    }
    paths[key] = { $ref: `./paths/${file}${pointer(key)}` };
    owner[key] = file;
  }
}

root.paths = Object.fromEntries(Object.keys(paths).sort().map((k) => [k, paths[k]]));

const outName = only ? `.fragment-${only.map((f) => f.replace(/\.yaml$/, "")).join("+")}.yaml` : "openapi.yaml";
const header = "# FILE GENERATED oleh scripts/assemble.mjs — jangan diedit manual.\n";
writeFileSync(join(srcDir, outName), header + YAML.stringify(root, { lineWidth: 0 }));
console.log(`${Object.keys(paths).length} path dari ${files.length} fragmen → src/${outName}`);
