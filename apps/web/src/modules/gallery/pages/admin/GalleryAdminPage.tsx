import { ResourceManager } from "@/modules/content/components/ResourceManager";
import { MediaLibraryPanel } from "@/modules/media/components/MediaLibraryPanel";

interface GalleryItem {
  id: number;
  status: string;
  media_type?: string | null;
  caption?: string | null;
}

/** FE-C14: manager gambar/video + poster; Media Library. */
export default function GalleryAdminPage() {
  return (
    <div className="space-y-4">
      <ResourceManager<GalleryItem>
        resource="gallery-items"
        title="Galeri Perusahaan"
        description="Dokumentasi visual yang tampil di halaman galeri publik."
        addLabel="Tambah item galeri"
        itemLabel="item galeri"
        seoPath="/admin/gallery"
        fields={[
          {
            name: "media_type",
            label: "Tipe media",
            type: "select",
            required: true,
            options: [
              { value: "image", label: "Gambar" },
              { value: "video", label: "Video" },
            ],
          },
          { name: "sort_order", label: "Urutan", type: "number" },
          { name: "caption", label: "Keterangan", type: "textarea", required: true },
          { name: "media_file_id", label: "Media", type: "media", usage: "gallery" },
          {
            name: "poster_media_id",
            label: "Poster video",
            type: "media",
            usage: "gallery",
            hint: "Khusus video — gambar pratinjau sebelum diputar.",
          },
        ]}
        columns={[
          { label: "Tipe", value: (item) => (item.media_type === "video" ? "Video" : "Gambar") },
          { label: "Keterangan", value: (item) => item.caption ?? "—" },
        ]}
        primaryText={(item) => item.caption ?? `Galeri #${item.id}`}
      />
      <MediaLibraryPanel />
    </div>
  );
}
