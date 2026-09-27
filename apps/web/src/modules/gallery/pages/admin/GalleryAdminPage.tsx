import { ResourceManager } from "@/modules/content/components/ResourceManager";
import { MediaLibraryPanel } from "@/modules/media/components/MediaLibraryPanel";

interface GalleryItem {
  id: number;
  status?: string | null;
  media_type: "image" | "video";
  caption: string;
  media_file_id?: number | null;
  poster_media_id?: number | null;
  sort_order?: number | null;
}

/** Port 1:1 `routes/admin.gallery.tsx` legacy (FE-C14): manager galeri + Media Library. */
export default function GalleryAdminPage() {
  return (
    <div className="space-y-10">
      <ResourceManager<GalleryItem>
        resource="gallery-items"
        title="Galeri Perusahaan"
        description="Kelola gambar dan video dokumentasi perusahaan."
        addLabel="Tambah Galeri"
        itemLabel="galeri"
        seoPath="/admin/gallery"
        imageField="media_file_id"
        searchPlaceholder="Cari keterangan galeri..."
        primaryText={(item) => item.caption}
        secondaryText={(item) => (item.media_type === "video" ? "Video" : "Gambar")}
        columns={[
          {
            label: "Keterangan",
            value: (item) => <p className="line-clamp-2 font-semibold">{item.caption}</p>,
          },
          { label: "Tipe", value: (item) => (item.media_type === "video" ? "Video" : "Gambar") },
          { label: "Urutan", value: (item) => item.sort_order ?? 0 },
        ]}
        fields={[
          {
            name: "media_type",
            label: "Tipe Media",
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
          { name: "poster_media_id", label: "Poster Video", type: "media", usage: "gallery" },
        ]}
        defaultValues={{ media_type: "image", sort_order: 0 }}
      />
      <MediaLibraryPanel />
    </div>
  );
}
