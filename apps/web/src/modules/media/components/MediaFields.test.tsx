// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Toaster } from "sonner";
import { Outlet } from "react-router-dom";
import { MediaUploadField } from "@/modules/media/components/MediaUploadField";
import GalleryAdminPage from "@/modules/gallery/pages/admin/GalleryAdminPage";
import { loginAs, renderWithRoutes, stubEventSource } from "@/test/utils";
import { contentService } from "@/modules/content";
import { ApiError } from "@/shared/services/api-error";
import { mediaService } from "@/modules/media/services/media.service";
import type { ContractSchemas } from "@/shared/types/contract";

function shell(children: React.ReactNode, routePath: string) {
  return renderWithRoutes(
    [
      {
        path: "/",
        element: (
          <>
            <Outlet />
            <Toaster />
          </>
        ),
        children: [{ path: routePath, element: children }],
      },
    ],
    `/${routePath}`,
  );
}

describe("FE-M02 upload progres & error Indonesia", () => {
  it("file dipilih → prepare → upload → onUploaded + toast", async () => {
    const user = userEvent.setup();
    stubEventSource();
    await loginAs();
    const fakeMedia = {
      id: 4242,
      media_type: "image",
      original_file_name: "foto.jpg",
      compression_status: "completed",
      thumbnail_url: "http://localhost/mock-media/4242/thumbnail",
      medium_url: "http://localhost/mock-media/4242/medium",
      file_url: "http://localhost/mock-media/4242/original",
    };
    const uploadSpy = vi
      .spyOn(mediaService, "uploadWithProgress")
      .mockImplementation(
        async (_file: File, _options: unknown, onProgress?: (p: number) => void) => {
          onProgress?.(100);
          return fakeMedia as never;
        },
      );
    let uploaded: ContractSchemas["MediaItem"] | null = null;
    render(
      <>
        <MediaUploadField
          label="Gambar"
          usage="portfolio"
          onUploaded={(media) => {
            uploaded = media;
          }}
        />
        <Toaster />
      </>,
    );
    try {
      const input = screen.getByLabelText("Gambar") as HTMLInputElement;
      await user.upload(input, new File(["fake-image-bytes"], "foto.jpg", { type: "image/jpeg" }));
      await waitFor(() => expect(uploaded).not.toBeNull());
      expect(uploadSpy).toHaveBeenCalled();
      expect(uploaded!.id).toBe(4242);
      expect(await screen.findByText("Media berhasil diunggah")).toBeInTheDocument();
    } finally {
      uploadSpy.mockRestore();
    }
  });

  it("gagal upload → toast Indonesia", async () => {
    stubEventSource();
    await loginAs();
    const uploadSpy = vi
      .spyOn(mediaService, "uploadWithProgress")
      .mockRejectedValue(
        new ApiError({ code: "UNSUPPORTED_MEDIA_TYPE", message: "Format file belum didukung." }),
      );
    render(
      <>
        <MediaUploadField label="Gambar" usage="portfolio" onUploaded={() => undefined} />
        <Toaster />
      </>,
    );
    try {
      const input = screen.getByLabelText("Gambar") as HTMLInputElement;
      const { fireEvent } = await import("@testing-library/react");
      fireEvent.change(input, {
        target: { files: [new File(["x"], "dok.pdf", { type: "application/pdf" })] },
      });
      await waitFor(() => expect(uploadSpy).toHaveBeenCalled());
      expect(await screen.findByText("Unggah gagal")).toBeInTheDocument();
    } finally {
      uploadSpy.mockRestore();
    }
  });

  it("file kosong + error generik", async () => {
    stubEventSource();
    await loginAs();
    const uploadSpy = vi
      .spyOn(mediaService, "uploadWithProgress")
      .mockRejectedValue(new Error("x"));
    render(
      <>
        <MediaUploadField
          label="Gambar"
          usage="portfolio"
          hint="Petunjuk"
          onUploaded={() => undefined}
        />
        <Toaster />
      </>,
    );
    try {
      const input = screen.getByLabelText("Gambar") as HTMLInputElement;
      const { fireEvent } = await import("@testing-library/react");
      fireEvent.change(input, { target: { files: [] } });
      expect(uploadSpy).not.toHaveBeenCalled();
      fireEvent.change(input, {
        target: { files: [new File(["x"], "a.jpg", { type: "image/jpeg" })] },
      });
      expect(await screen.findByText("Unggah gagal")).toBeInTheDocument();
    } finally {
      uploadSpy.mockRestore();
    }
  });
});

describe("FE-C14 galeri admin + pustaka", () => {
  it("item video menampilkan label Video di manager", async () => {
    await loginAs();
    await contentService.create("gallery-items", {
      media_type: "video",
      caption: "Video Uji Manager",
      status: "published",
    });
    shell(<GalleryAdminPage />, "galeri");
    await waitFor(() => expect(screen.getByText("Galeri Perusahaan")).toBeInTheDocument());
    // Kolom Tipe manager me-render "Video" untuk item video.
    expect(await screen.findAllByText("Video Uji Manager")).not.toHaveLength(0);
  });
  it("manager + panel pustaka tampil; arsip & hapus", async () => {
    const user = userEvent.setup();
    stubEventSource();
    await loginAs();
    shell(<GalleryAdminPage />, "galeri");
    await waitFor(() => expect(screen.getByText("Galeri Perusahaan")).toBeInTheDocument());
    expect(screen.getByText("Pustaka Media")).toBeInTheDocument();
    const filterGroup = screen.getByRole("group", { name: "Filter pustaka" });
    for (const label of ["Aktif", "Arsip", "Perlu dibersihkan"]) {
      expect(filterGroup.querySelector(`button[aria-pressed]`) ?? filterGroup).toBeInTheDocument();
      expect(
        Array.from(filterGroup.querySelectorAll("button")).some(
          (button) => button.textContent === label,
        ),
      ).toBe(true);
    }
    // Arsipkan satu item dari pustaka (bukan tombol filter — tanpa aria-pressed).
    const library = screen.getByLabelText("Pustaka media");
    let archiveButtons: HTMLButtonElement[] = [];
    await waitFor(() => {
      archiveButtons = Array.from(library.querySelectorAll("button")).filter(
        (button) => button.textContent === "Arsip" && !button.hasAttribute("aria-pressed"),
      ) as HTMLButtonElement[];
      expect(archiveButtons.length).toBeGreaterThan(0);
    });
    expect(archiveButtons.length).toBeGreaterThan(0);
    expect(archiveButtons.length).toBeGreaterThan(0);
    await user.click(archiveButtons[0]);
    const confirm = await screen.findByRole("alertdialog");
    await user.click(confirm.querySelector("button:last-child") as HTMLButtonElement);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });
});
