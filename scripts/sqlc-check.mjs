#!/usr/bin/env node
// CI: pastikan kode sqlc yang di-commit sama dengan hasil generate (`sqlc diff`).
// Selama belum ada satu pun file query (sebelum PLAN-03 fase B2), sqlc akan gagal dengan
// "no queries contained in paths" — kondisi itu dilaporkan sebagai SKIP, bukan lulus diam-diam.
import { spawnSync } from "node:child_process";
import { readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const apiDir = join(dirname(fileURLToPath(import.meta.url)), "..", "apps", "api");
const modulesDir = join(apiDir, "internal", "modules");

function hasSql(dir) {
  if (!existsSync(dir)) return false;
  return readdirSync(dir).some((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? hasSql(p) : name.endsWith(".sql");
  });
}

const modulesWithQueries = existsSync(modulesDir)
  ? readdirSync(modulesDir).filter((m) => hasSql(join(modulesDir, m, "infrastructure", "queries")))
  : [];

if (modulesWithQueries.length === 0) {
  console.log("sqlc:check SKIP — belum ada file query di modul mana pun.");
  process.exit(0);
}

const res = spawnSync("sqlc", ["diff"], { cwd: apiDir, stdio: "inherit", shell: process.platform === "win32" });
process.exit(res.status ?? 1);
