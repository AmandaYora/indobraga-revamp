import { rmSync } from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// public/mockServiceWorker.js hanya untuk `npm run dev:mock`; bundle produksi harus bebas MSW.
function stripMockWorker(): Plugin {
  let outDir = "dist";
  return {
    name: "indobraga:strip-mock-worker",
    apply: "build",
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      rmSync(path.join(outDir, "mockServiceWorker.js"), { force: true });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), stripMockWorker()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  server: {
    port: 5173,
    // Same origin in dev, same as the single-container production model.
    proxy: {
      "/api": {
        target: process.env.VITE_DEV_API_TARGET ?? "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
  build: {
    // Dipakai Go untuk `modulepreload` & preload font/chunk per route (PLAN-02 §2.1).
    manifest: true,
    sourcemap: "hidden",
  },
});
