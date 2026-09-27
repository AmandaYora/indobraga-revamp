// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { prepareImageForUpload } from "@/shared/lib/image-compression";

describe("prepareImageForUpload", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("memakai file asli untuk tipe yang tidak dikompresi", async () => {
    const file = new File(["gif-data"], "animasi.gif", { type: "image/gif" });
    const result = await prepareImageForUpload(file);
    expect(result.compressed).toBe(false);
    expect(result.file).toBe(file);
    expect(result.finalSize).toBe(file.size);
  });

  it("memakai file asli bila createImageBitmap tidak tersedia", async () => {
    const file = new File(["jpeg-data"], "foto.jpg", { type: "image/jpeg" });
    const result = await prepareImageForUpload(file);
    // Node/jsdom tanpa createImageBitmap → fallback file asli.
    expect(result.compressed).toBe(false);
    expect(result.originalSize).toBe(file.size);
  });

  it("mengompresi bila hasil lebih kecil", async () => {
    const close = vi.fn();
    vi.stubGlobal(
      "createImageBitmap",
      async () => ({ width: 4000, height: 2000, close }) as unknown as ImageBitmap,
    );
    const drawImage = vi.fn();
    const toBlob = vi.fn((callback: BlobCallback) => {
      callback(new Blob(["kecil"], { type: "image/webp" }));
    });
    const getContext = vi.fn(() => ({ drawImage }));
    const realCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(((
      tag: string,
      options?: ElementCreationOptions,
    ) => {
      const node = realCreateElement(tag, options) as HTMLCanvasElement;
      if (tag === "canvas") {
        node.getContext = getContext as never;
        node.toBlob = toBlob as never;
      }
      return node;
    }) as typeof document.createElement);

    const file = new File(["jpeg-data-yang-jauh-lebih-besar-dari-hasil-kompresi"], "foto.jpg", {
      type: "image/jpeg",
    });
    const result = await prepareImageForUpload(file);
    expect(result.compressed).toBe(true);
    expect(result.file.type).toBe("image/webp");
    expect(close).toHaveBeenCalled();
    expect(drawImage).toHaveBeenCalled();
  });

  it("memakai file asli bila kompresi gagal atau tidak lebih kecil", async () => {
    const close = vi.fn();
    vi.stubGlobal(
      "createImageBitmap",
      async () => ({ width: 100, height: 100, close }) as unknown as ImageBitmap,
    );
    // toBlob null → asli.
    const nullCanvas = {
      getContext: () => ({ drawImage: () => undefined }),
      toBlob: (cb: BlobCallback) => cb(null),
    };
    vi.spyOn(document, "createElement").mockImplementation((() => nullCanvas) as never);
    const file = new File(["x"], "foto.jpg", { type: "image/jpeg" });
    expect((await prepareImageForUpload(file)).compressed).toBe(false);

    // Blob lebih besar dari asli → asli.
    const bigCanvas = {
      getContext: () => ({ drawImage: () => undefined }),
      toBlob: (cb: BlobCallback) => cb(new Blob(["x".repeat(1000)], { type: "image/webp" })),
    };
    vi.spyOn(document, "createElement").mockImplementation((() => bigCanvas) as never);
    expect((await prepareImageForUpload(file)).compressed).toBe(false);
  });

  it("graceful bila createImageBitmap melempar", async () => {
    vi.stubGlobal("createImageBitmap", async () => {
      throw new Error("decode gagal");
    });
    const file = new File(["x"], "foto.png", { type: "image/png" });
    const result = await prepareImageForUpload(file);
    expect(result.compressed).toBe(false);
  });
});
