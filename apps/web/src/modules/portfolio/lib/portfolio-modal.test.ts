import { describe, expect, it } from "vitest";
import { toModalItem } from "@/modules/portfolio/lib/portfolio-modal";

describe("toModalItem", () => {
  it("memakai images bila ada, fallback medium/thumbnail", () => {
    const withImages = toModalItem({
      id: 1,
      title: "T",
      slug: "t",
      images: ["https://x.test/a.webp", "https://x.test/b.webp"],
    });
    expect(withImages.images).toHaveLength(2);

    const withoutImages = toModalItem({
      id: 2,
      title: "U",
      slug: "u",
      medium_url: "https://x.test/m.webp",
      thumbnail_url: null,
    });
    expect(withoutImages.images).toEqual([{ url: "https://x.test/m.webp", alt: "U" }]);

    const empty = toModalItem({ id: 3, title: "V", slug: "v" });
    expect(empty.images).toEqual([]);
    expect(empty.cover).toBeFalsy();
  });

  it("alt_text dipakai bila ada", () => {
    const item = toModalItem({
      id: 4,
      title: "W",
      slug: "w",
      alt_text: "Alt khusus",
      medium_url: "https://x.test/m.webp",
    });
    expect(item.images[0].alt).toBe("Alt khusus");
  });
});
