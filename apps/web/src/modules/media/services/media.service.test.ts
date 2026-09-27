import { describe, expect, it } from "vitest";
import { mediaService } from "@/modules/media/services/media.service";
import { loginAs } from "@/test/utils";

/** Multipart nyata (undici) — jsdom File tidak kompatibel dengan parser MSW. */
describe("mediaService multipart", () => {
  it("upload image → completed + URL absolut", async () => {
    await loginAs();
    const file = new File(["fake-image-bytes"], "foto.jpg", { type: "image/jpeg" });
    const media = await mediaService.upload(file, { usage: "portfolio", alt_text: "foto.jpg" });
    expect(media.compression_status).toBe("completed");
    expect(media.file_url).toContain("http://localhost/mock-media/");
  });

  it("usage invalid → VALIDATION_ERROR", async () => {
    await loginAs();
    const file = new File(["x"], "foto.jpg", { type: "image/jpeg" });
    const error = await mediaService
      .upload(file, { usage: "salah" })
      .then(() => null)
      .catch((e) => e);
    expect(error?.code).toBe("VALIDATION_ERROR");
  });

  it("detail, arsip, unarsip, retry, hapus", async () => {
    await loginAs();
    const file = new File(["fake-image-bytes"], "foto.jpg", { type: "image/jpeg" });
    const media = await mediaService.upload(file, { usage: "other" });

    const detail = await mediaService.detail(media.id);
    expect(detail.id).toBe(media.id);

    const progressed = await mediaService.uploadWithProgress(
      file,
      { usage: "other" },
      () => undefined,
    );
    expect(progressed.id).toBeDefined();

    const archived = await mediaService.archive(media.id);
    expect(archived.compression_status).toBe("archived");

    const unarchived = await mediaService.unarchive(media.id);
    expect(unarchived.compression_status).toBe("completed");

    const retried = await mediaService.retry(media.id);
    expect(retried.compression_status).toBe("processing");

    await mediaService.remove(media.id);
    const gone = await mediaService.detail(media.id).then(
      () => null,
      (e: { code?: string }) => e,
    );
    expect(gone?.code).toBe("NOT_FOUND");
  });

  it("tipe tak didukung → VALIDATION_ERROR", async () => {
    await loginAs();
    const file = new File(["x"], "dok.pdf", { type: "application/pdf" });
    const error = await mediaService
      .upload(file, { usage: "other" })
      .then(() => null)
      .catch((e) => e);
    expect(error?.code).toBe("VALIDATION_ERROR");
  });
});
