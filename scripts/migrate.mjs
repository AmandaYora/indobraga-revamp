#!/usr/bin/env node
// golang-migrate wrapper that works the same in PowerShell, cmd, and sh.
// npm runs scripts through cmd.exe on Windows, which does not expand $VAR — so the DB
// connection is read here from .env and passed as a literal argument instead.
//
// Dijalankan TANPA shell: DSN Go memakai query string (`?parseTime=true&loc=UTC&...`) dan
// cmd.exe akan memotong argumen di karakter `&`. libuv tetap menemukan `migrate.exe` di PATH.
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

function loadDotEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m || process.env[m[1]]) continue;
    let value = m[2].trim();
    if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1);
    else value = value.replace(/\s+#.*$/, ""); // komentar inline (nilai tanpa kutip)
    process.env[m[1]] = value;
  }
}

loadDotEnv(".env");

const dsn = process.env.DB_DSN;
if (!dsn) {
  console.error("DB_DSN not found. Copy .env.example to .env and fill in DB_DSN.");
  process.exit(1);
}

const r = spawnSync(
  "migrate",
  ["-path", "migrations", "-database", `mysql://${dsn}`, ...process.argv.slice(2)],
  { cwd: "apps/api", stdio: "inherit", shell: false },
);
if (r.error) {
  console.error(`Gagal menjalankan migrate: ${r.error.message}`);
  process.exit(1);
}
process.exit(r.status ?? 1);
