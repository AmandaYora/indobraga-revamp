#!/usr/bin/env node
// Memvalidasi satu/lebih fragmen path tanpa menyentuh openapi.yaml bersama, sehingga beberapa
// orang/agent bisa bekerja paralel pada fragmen berbeda.
//
//   node scripts/validate-fragment.mjs src/paths/leads.yaml [src/paths/audience.yaml ...]
import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = process.argv.slice(2).map((f) => basename(f));
if (files.length === 0) {
  console.error("Pemakaian: node scripts/validate-fragment.mjs src/paths/<fragmen>.yaml ...");
  process.exit(2);
}

const run = (cmd, args) =>
  spawnSync(cmd, args, { cwd: pkgDir, stdio: "inherit", shell: process.platform === "win32" });

const tmp = join(pkgDir, "src", `.fragment-${files.map((f) => f.replace(/\.yaml$/, "")).join("+")}.yaml`);
let status = run("node", ["scripts/assemble.mjs", "--only", ...files]).status;
if (status === 0) status = run("npx", ["redocly", "lint", tmp, "--config", "redocly.yaml"]).status;
rmSync(tmp, { force: true });
process.exit(status ?? 1);
