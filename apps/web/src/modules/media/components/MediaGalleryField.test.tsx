// @vitest-environment jsdom
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MediaGalleryField } from "@/modules/media/components/MediaGalleryField";
import { mediaService } from "@/modules/media/services/media.service";
import { loginAs } from "@/test/utils";
import type { ContractSchemas } from "@/shared/types/contract";

type MediaItem = ContractSchemas["MediaItem"];

function fakeMedia(id: number): MediaItem {
  return {
    id,
    media_type: "image",
    mime_type: "image/jpeg",
    original_file_name: `foto-${id}.jpg`,
    compression_status: "completed",
    thumbnail_url: `http://localhost/mock-media/${id}/thumbnail`,
    medium_url: `http://localhost/mock-media/${id}/medium`,
    file_url: `http://localhost/mock-media/${id}/original`,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  } as MediaItem;
}

describe("MediaGalleryField", () => {
  it("upload multi + sampul + geser + hapus + batas maks", async () => {
    const user = userEvent.setup();
    await loginAs();
    let nextId = 5000;
    const spy = vi.spyOn(mediaService, "upload").mockImplementation(async () => {
      nextId += 1;
      return fakeMedia(nextId);
    });
    let current: number[] = [];
    function Harness() {
      const [ids, setIds] = React.useState<number[]>([]);
      const [previews, setPreviews] = React.useState<(MediaItem | null)[]>([]);
      current = ids;
      return (
        <MediaGalleryField
          label="Galeri"
          usage="portfolio"
          max={3}
          ids={ids}
          previews={previews}
          onChange={(nextIds, nextPreviews) => {
            setIds(nextIds);
            setPreviews(nextPreviews);
          }}
        />
      );
    }
    try {
      render(<Harness />);
      const input = screen.getByLabelText("Galeri") as HTMLInputElement;
      fireEvent.change(input, {
        target: {
          files: [
            new File(["a"], "a.jpg", { type: "image/jpeg" }),
            new File(["b"], "b.jpg", { type: "image/jpeg" }),
          ],
        },
      });
      await waitFor(() => expect(current).toHaveLength(2));
      // Index 0 = sampul.
      expect(screen.getByText("Sampul")).toBeInTheDocument();
      // Geser kanan menukar urutan.
      const rightButtons = screen.getAllByLabelText("Geser kanan");
      await user.click(rightButtons[0]);
      await waitFor(() => expect(current[0]).not.toBe(current[1]));
      // Hapus satu.
      await user.click(screen.getAllByLabelText("Hapus")[0]);
      await waitFor(() => expect(current).toHaveLength(1));
      // Geser kiri di ujung (tak berubah) + geser kanan.
      await user.click(screen.getAllByLabelText("Geser kiri")[0]);
      expect(current).toHaveLength(1);
      // Penuh (3) → pesan batas.
      fireEvent.change(input, {
        target: {
          files: [
            new File(["c"], "c.jpg", { type: "image/jpeg" }),
            new File(["d"], "d.jpg", { type: "image/jpeg" }),
            new File(["e"], "e.jpg", { type: "image/jpeg" }),
          ],
        },
      });
      await waitFor(() => expect(current).toHaveLength(3));
      expect(screen.getByText("Batas maksimal 3 gambar sudah tercapai.")).toBeInTheDocument();
      // Upload saat penuh → toast batas.
      fireEvent.change(input, {
        target: { files: [new File(["f"], "f.jpg", { type: "image/jpeg" })] },
      });
      expect(
        await screen.findByText("Batas maksimal 3 gambar sudah tercapai."),
      ).toBeInTheDocument();
    } finally {
      spy.mockRestore();
    }
  });
});
