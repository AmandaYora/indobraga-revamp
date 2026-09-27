import { describe, expect, it } from "vitest";
import {
  asNumberArray,
  mediaGalleryPreviewFieldName,
  mediaPreviewFieldName,
  normalizePayload,
} from "@/modules/content/lib/resource-helpers";

describe("resource-helpers", () => {
  it("nama field preview media (paritas legacy persis)", () => {
    expect(mediaPreviewFieldName("media_file_id")).toBe("media_file");
    expect(mediaPreviewFieldName("logo_media_id")).toBe("logo_media");
    expect(mediaPreviewFieldName("thumbnail_media_file_id")).toBe("thumbnail_media_file");
    expect(mediaPreviewFieldName("poster_media_id")).toBe("poster_media");
    expect(mediaPreviewFieldName("galeri")).toBe("galeri_preview");
    expect(mediaGalleryPreviewFieldName("media_file_ids")).toBe("media_files");
    expect(mediaGalleryPreviewFieldName("galeri")).toBe("galeri_previews");
  });

  it("normalizePayload membuang key asing & kosong, konversi paragraphs & select numerik", () => {
    const fields = [
      { name: "title", label: "Judul", type: "text" as const },
      { name: "content", label: "Isi", type: "paragraphs" as const },
      {
        name: "category_id",
        label: "Kategori",
        type: "select" as const,
        valueType: "number" as const,
      },
      { name: "media_file_ids", label: "Gambar", type: "media-multi" as const },
    ];
    const payload = normalizePayload(
      {
        status: "published",
        title: "Halo",
        content: "Satu\n\n\nDua\n ",
        category_id: "7",
        media_file_ids: [1, "x", 2],
        kosong: "",
        takDikenal: "buang",
      },
      fields,
    );
    expect(payload).toEqual({
      status: "published",
      title: "Halo",
      content: ["Satu", "Dua"],
      category_id: 7,
      // Array media-multi diteruskan apa adanya (paritas legacy).
      media_file_ids: [1, "x", 2],
    });
  });

  it("asNumberArray menyaring non-angka", () => {
    expect(asNumberArray([1, "2", null, 3.5])).toEqual([1, 3.5]);
    expect(asNumberArray("bukan-array")).toEqual([]);
  });
});
