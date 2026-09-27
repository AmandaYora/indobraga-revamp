// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from "vitest";
import { readBootstrap, resetBootstrapForTest } from "@/shared/services/bootstrap";

function setBootstrap(payload: unknown | null) {
  document.body.innerHTML =
    payload === null
      ? ""
      : `<script id="__INDOBRAGA_BOOTSTRAP__" type="application/json">${JSON.stringify(payload)}</script>`;
}

describe("readBootstrap", () => {
  beforeEach(() => {
    resetBootstrapForTest();
    document.body.innerHTML = "";
  });

  it("membaca payload yang cocok lalu menghapus node-nya", () => {
    setBootstrap({ path: "/", site_settings: { brand: "X" }, seo: {}, page: { a: 1 } });
    const first = readBootstrap("/");
    expect(first?.path).toBe("/");
    expect(document.getElementById("__INDOBRAGA_BOOTSTRAP__")).toBeNull();
    expect(readBootstrap("/")).toBe(first);
  });

  it("mengembalikan null untuk URL yang tidak cocok", () => {
    setBootstrap({ path: "/", site_settings: {} });
    expect(readBootstrap("/berita")).toBeNull();
  });

  it("menolak payload berbahaya (bukan JSON / gagal Zod)", () => {
    document.body.innerHTML =
      `<script id="__INDOBRAGA_BOOTSTRAP__" type="application/json">` +
      `{"path":[],"site_settings":"</script><script>alert(1)</script>}` +
      `</script>`;
    expect(readBootstrap("/")).toBeNull();
    expect(document.getElementById("__INDOBRAGA_BOOTSTRAP__")).toBeNull();
    resetBootstrapForTest();
    document.body.innerHTML = "";
    expect(readBootstrap("/")).toBeNull();
  });
});
