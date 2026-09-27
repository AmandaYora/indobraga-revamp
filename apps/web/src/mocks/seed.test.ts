import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { contractFor } from "@/mocks/openapi";

const here = dirname(fileURLToPath(import.meta.url));
const SEED_DIR = join(here, "seed");

const ADMIN_RESOURCES = [
  "hero-slides",
  "portfolio-categories",
  "printing-capacities",
  "production-capacities",
  "production-strengths",
  "gallery-items",
  "whatsapp-leads",
  "email-accounts",
  "email-templates",
  "email-campaigns",
  "site-settings",
  "hero",
  "partners",
  "services",
  "machines",
  "portfolios",
  "news",
  "media",
  "inquiries",
  "notifications",
  "users",
  "dashboard",
  "audience",
];

/** Suffix multi-kata → segmen path kontrak. */
const ADMIN_SUFFIXES: Record<string, string> = {
  "read-all": "read-all",
  "unread-count": "unread-count",
  "google-oauth-url": "google/oauth-url",
  "smtp-test": "smtp/test",
  "draft-from-audience": "draft/from-audience",
  "draft-from-inquiries": "draft/from-inquiries",
  "recipient-sources-inquiries-preview": "recipient-sources/inquiries/preview",
  "resend-failed": "resend-failed",
};

/** Petakan nama file seed → (method, path konkret) operasi kontrak. */
export function seedToOperation(basename: string): { method: string; path: string } | null {
  if (!basename.endsWith(".json")) return null;
  const method = basename.split("-")[0].toLowerCase();
  if (!["get", "post", "patch", "put", "delete"].includes(method)) return null;
  let rest = basename.slice(method.length + 1, -".json".length);
  if (rest.endsWith("-mut")) rest = rest.slice(0, -"-mut".length);
  if (!rest.startsWith("api-v1-")) return null;
  rest = rest.slice("api-v1-".length);

  // Varian halaman/cursor/slug publik → path dasarnya.
  rest = rest.replace(/-page\d+$/, "").replace(/-cursor\d+$/, "");
  if (rest === "public-news-slug")
    return { method, path: "/api/v1/public/news/kapasitas-produksi-90000-pcs" };
  if (rest.startsWith("public-seo-")) {
    const route = rest.slice("public-seo-".length);
    // Slug artikel memakai bentuk dash satu segmen (sesuai nama file baseline).
    return { method, path: `/api/v1/public/seo/${route}` };
  }
  if (rest.startsWith("public-")) {
    const tail = rest.slice("public-".length);
    const resource = [
      "portfolio-categories",
      "site-settings",
      "portfolio",
      "gallery",
      "facilities",
      "home",
      "news",
    ].find((candidate) => tail === candidate || tail.startsWith(`${candidate}-`));
    if (!resource) return null;
    return { method, path: `/api/v1/public/${resource}` };
  }
  if (rest.startsWith("auth-")) {
    return { method, path: `/api/v1/${rest.replace(/-/g, "/")}` };
  }
  if (rest.startsWith("oauth-")) return null; // Callback 302 — diuji manual di contract.test.ts.

  if (rest.startsWith("internal-")) {
    const table: Record<string, string> = {
      "internal-workers-email-campaigns-tick": "/api/v1/internal/workers/email-campaigns/tick",
      "internal-workers-notifications-tick": "/api/v1/internal/workers/notifications/tick",
      "internal-revalidation-tick": "/api/v1/internal/revalidation/tick",
    };
    const path = table[rest];
    return path ? { method, path } : null;
  }

  if (rest.startsWith("admin-")) {
    const tail = rest.slice("admin-".length);
    const resource = ADMIN_RESOURCES.find(
      (candidate) => tail === candidate || tail.startsWith(`${candidate}-`),
    );
    if (!resource) return null;
    let extra = tail.slice(resource.length);
    if (extra.startsWith("-")) extra = extra.slice(1);
    if (!extra) return { method, path: `/api/v1/admin/${resource}` };
    // Suffix multi-kata dulu, lalu segmen per segmen (id numerik tetap angka).
    for (const [suffix, segments] of Object.entries(ADMIN_SUFFIXES)) {
      if (extra === suffix || extra.startsWith(`${suffix}-`) || extra.endsWith(`-${suffix}`)) {
        const remaining = extra.replace(suffix, "").split("-").filter(Boolean);
        return {
          method,
          path: `/api/v1/admin/${resource}/${[...remaining, segments].join("/").replace(/\/\//g, "/")}`,
        };
      }
    }
    const segments = extra.split("-").filter(Boolean);
    return { method, path: `/api/v1/admin/${resource}/${segments.join("/")}` };
  }
  return null;
}

describe("seed valid terhadap kontrak", () => {
  const files = readdirSync(SEED_DIR)
    .filter((file) => file.endsWith(".json"))
    .sort();
  expect(files.length).toBeGreaterThan(100);

  for (const file of files) {
    it(file, () => {
      const mapped = seedToOperation(file);
      expect(mapped, `tidak bisa dipetakan ke operasi: ${file}`).not.toBeNull();
      if (!mapped) return;
      const seed = JSON.parse(readFileSync(join(SEED_DIR, file), "utf8")) as {
        success: boolean;
      };
      if (!seed.success) return;
      // Status sukses primer (200); beberapa operasi memakai 201/302 — lewati bila tak cocok.
      try {
        contractFor(mapped.method, mapped.path).assertResponse(200, seed);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("tidak mendefinisikan respons 200")) return;
        throw error;
      }
    });
  }
});
