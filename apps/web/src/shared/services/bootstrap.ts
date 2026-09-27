// zod/mini: modul ini ada di jalur JS awal setiap halaman publik; varian mini jauh lebih
// kecil daripada zod penuh (yang tetap dipakai form di chunk lazy).
import * as z from "zod/mini";

const bootstrapSchema = z.object({
  path: z.string(),
  site_settings: z.optional(z.record(z.string(), z.unknown())),
  seo: z.optional(z.record(z.string(), z.unknown())),
  page: z.optional(z.unknown()),
});

export type BootstrapPayload = z.infer<typeof bootstrapSchema>;

const BOOTSTRAP_ELEMENT_ID = "__INDOBRAGA_BOOTSTRAP__";

let cached: BootstrapPayload | null | undefined;

/**
 * Baca `<script id="__INDOBRAGA_BOOTSTRAP__" type="application/json">` sekali,
 * validasi Zod, lalu hapus node-nya (PLAN-02 §2.3). Mengembalikan payload hanya
 * bila `path`-nya cocok dengan URL saat ini. Data: `site_settings`, `seo`,
 * `page`, `path`.
 */
export function readBootstrap(currentPath: string): BootstrapPayload | null {
  if (cached === undefined) {
    cached = null;
    if (typeof document !== "undefined") {
      const node = document.getElementById(BOOTSTRAP_ELEMENT_ID);
      if (node && node.textContent?.trim() !== "") {
        try {
          const parsed: unknown = JSON.parse(node.textContent ?? "null");
          const result = bootstrapSchema.safeParse(parsed);
          if (result.success) cached = result.data;
        } catch {
          cached = null;
        } finally {
          node.remove();
        }
      }
    }
  }
  if (!cached || cached.path !== currentPath) return null;
  return cached;
}

/** Reset cache baca (khusus test). */
export function resetBootstrapForTest() {
  cached = undefined;
}
