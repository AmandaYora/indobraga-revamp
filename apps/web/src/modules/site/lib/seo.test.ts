import { describe, expect, it } from "vitest";
import {
  absoluteUrl,
  articleJsonLd,
  organizationJsonLd,
  pageSeo,
  websiteJsonLd,
  withSiteName,
} from "@/modules/site/lib/seo";

describe("seo fallback", () => {
  it("withSiteName menambah suffix sekali", () => {
    expect(withSiteName("Berita")).toBe("Berita - Indobraga");
    expect(withSiteName("Berita - Indobraga")).toBe("Berita - Indobraga");
  });

  it("pageSeo publik memakai canonical + robots index", () => {
    const tags = pageSeo({ title: "Berita", description: "Kabar", path: "/berita" });
    expect(tags.canonical).toBe("https://indobraga.com/berita");
    expect(tags.robots).toContain("index, follow");
    expect(tags.og.type).toBe("website");
  });

  it("noindex menghilangkan canonical (BC-20)", () => {
    const tags = pageSeo({ title: "Masuk", path: "/login", noindex: true });
    expect(tags.canonical).toBeNull();
    expect(tags.robots).toBe("noindex, nofollow");
  });

  it("absoluteUrl passthrough absolut", () => {
    expect(absoluteUrl("https://x.com/a.png")).toBe("https://x.com/a.png");
    expect(absoluteUrl("/galeri")).toBe("https://indobraga.com/galeri");
    expect(absoluteUrl("galeri")).toBe("https://indobraga.com/galeri");
  });

  it("JSON-LD organisasi & artikel", () => {
    expect(organizationJsonLd()["@type"]).toBe("Organization");
    expect(websiteJsonLd()["@type"]).toBe("WebSite");
    const article = articleJsonLd({
      title: "T",
      excerpt: "E",
      slug: "s",
      date: "2026-01-01",
      category: "C",
    });
    expect(article["@type"]).toBe("Article");
    expect(article.mainEntityOfPage).toBe("https://indobraga.com/berita/s");
  });

  it("artikel tanpa thumb/tanggal/kategori", () => {
    const article = articleJsonLd({ title: "T", slug: "s" });
    expect(article).not.toHaveProperty("image");
    expect(article.datePublished).toBeUndefined();
    expect(articleJsonLd({ title: "T", slug: "s", thumb: "https://x.test/t.png" }).image).toBe(
      "https://x.test/t.png",
    );
  });
});
