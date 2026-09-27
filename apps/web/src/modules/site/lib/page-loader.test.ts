// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { loadPublicPage } from "@/modules/site/lib/page-loader";
import { resetBootstrapForTest } from "@/shared/services/bootstrap";

describe("loadPublicPage", () => {
  it("pakai bootstrap bila URL cocok", async () => {
    resetBootstrapForTest();
    document.body.innerHTML = `<script id="__INDOBRAGA_BOOTSTRAP__" type="application/json">${JSON.stringify(
      {
        path: "/x",
        page: { halo: "dunia" },
      },
    )}</script>`;
    const result = await loadPublicPage("/x", async () => ({ halo: "api" }), { halo: "fallback" });
    expect(result).toEqual({ halo: "dunia" });
    resetBootstrapForTest();
    document.body.innerHTML = "";
  });

  it("fallback bila API gagal", async () => {
    resetBootstrapForTest();
    const result = await loadPublicPage(
      "/y",
      async () => {
        throw new Error("jaringan");
      },
      { halo: "fallback" },
    );
    expect(result).toEqual({ halo: "fallback" });
  });
});
