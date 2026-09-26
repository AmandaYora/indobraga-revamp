#!/usr/bin/env node
// `npm run dev:api` → Air di apps/api (watcher terkunci standar).
//
// Air di Windows hanya bisa menjalankan binary berakhiran .exe, sedangkan .air.toml
// memakai path Linux (dipakai CI/container). Daripada dua file config, wrapper ini
// meneruskan override build.cmd/build.bin khusus Windows lewat flag CLI Air.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const apiDir = join(dirname(fileURLToPath(import.meta.url)), "..", "apps", "api");

const args =
  process.platform === "win32"
    ? ["--build.cmd", "go build -o tmp\\main.exe ./cmd/server", "--build.bin", "tmp\\main.exe"]
    : [];

// Tanpa shell: argumen berisi spasi (build.cmd) harus sampai ke Air sebagai satu argumen utuh.
const child = spawn("air", [...args, ...process.argv.slice(2)], {
  cwd: apiDir,
  stdio: "inherit",
  shell: false,
});
child.on("error", (err) => {
  console.error(`Gagal menjalankan Air (${err.message}). Pastikan Air terpasang dan ada di PATH.`);
  process.exit(1);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("exit", (code) => process.exit(code ?? 0));
