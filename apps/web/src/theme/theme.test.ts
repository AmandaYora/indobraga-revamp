import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const LEGACY_CSS = join(
  here,
  "..",
  "..",
  "..",
  "..",
  "..",
  "indobraga",
  "apps",
  "web",
  "src",
  "styles.css",
);
const THEME_CSS = join(here, "theme.css");
const GLOBALS_CSS = join(here, "..", "styles", "globals.css");

function rootVars(css: string): Map<string, string> {
  const root = css.match(/:root\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  const vars = new Map<string, string>();
  for (const match of root.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    vars.set(match[1], match[2].trim().replace(/\s+/g, " "));
  }
  return vars;
}

// Dilewati bila checkout legacy tidak ada (mis. CI tanpa repo baseline).
describe.skipIf(!existsSync(LEGACY_CSS))("token tema identik dengan legacy (§2.4)", () => {
  const legacy = rootVars(readFileSync(LEGACY_CSS, "utf8"));
  const theme = rootVars(readFileSync(THEME_CSS, "utf8"));
  const globals = readFileSync(GLOBALS_CSS, "utf8");

  it("setiap token :root legacy ada dengan nilai sama", () => {
    const skipped = new Set(["--radius"]);
    for (const [name, value] of legacy) {
      if (skipped.has(name)) continue;
      expect(theme.get(name), `token ${name}`).toBe(value);
    }
  });

  it("token hardcode legacy dijadikan token bernama", () => {
    expect(theme.get("--whatsapp")).toBe("oklch(0.596 0.145 163.225)");
    expect(theme.get("--warning-strong")).toBe("oklch(0.45 0.15 75)");
  });

  it("utility & keyframes warisan ada di globals.css", () => {
    for (const token of [
      ".bg-gradient-hero",
      ".shadow-elegant",
      ".animate-fade-up",
      ".animate-hero-slide-one",
      ".skeleton-shimmer",
      "@keyframes fadeUp",
      "@keyframes heroSlideOne",
      "prefers-reduced-motion",
    ]) {
      expect(globals).toContain(token);
    }
  });

  it("palet .dark tidak dibawa", () => {
    expect(readFileSync(THEME_CSS, "utf8")).not.toMatch(/\.dark\s*\{/);
  });
});
