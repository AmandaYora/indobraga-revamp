import { ResourceManager } from "@/modules/content/components/ResourceManager";
import { formatDateId } from "@/shared/lib/date";

interface NewsArticle {
  id: number;
  status: string;
  title?: string | null;
  slug?: string | null;
  category?: string | null;
  excerpt?: string | null;
  published_at?: string | null;
}

/** FE-C15: field paragraf (split per baris), thumbnail & OG media, field SEO. */
export default function NewsAdminPage() {
  return (
    <ResourceManager<NewsArticle>
      resource="news"
      title="Berita"
      description="Kelola artikel yang tampil di halaman berita publik."
      addLabel="Tambah berita"
      itemLabel="berita"
      seoPath="/admin/news"
      searchPlaceholder="Cari berita..."
      imageField="thumbnail_media_file_id"
      fields={[
        { name: "title", label: "Judul", type: "text", required: true },
        {
          name: "slug",
          label: "Slug",
          type: "text",
          hint: "Otomatis dari judul bila dikosongkan.",
        },
        { name: "category", label: "Kategori", type: "text", required: true },
        { name: "excerpt", label: "Ringkasan", type: "textarea", required: true },
        {
          name: "content",
          label: "Isi artikel",
          type: "paragraphs",
          required: true,
          hint: "Satu paragraf per baris — baris kosong menjadi pemisah paragraf.",
        },
        { name: "thumbnail_media_file_id", label: "Thumbnail", type: "media", usage: "news" },
        {
          name: "og_image_media_file_id",
          label: "Gambar Saat Dibagikan",
          type: "media",
          usage: "og",
          hint: "Gambar pratinjau saat tautan dibagikan (Open Graph).",
        },
        { name: "seo_title", label: "Judul SEO", type: "text" },
        { name: "seo_description", label: "Deskripsi SEO", type: "textarea" },
      ]}
      columns={[
        { label: "Judul", value: (item) => item.title ?? "—" },
        { label: "Kategori", value: (item) => item.category ?? "—" },
        {
          label: "Terbit",
          value: (item) => (item.published_at ? formatDateId(item.published_at, "short") : "—"),
        },
      ]}
      primaryText={(item) => item.title ?? `Berita #${item.id}`}
    />
  );
}
