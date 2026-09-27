import { ResourceManager } from "@/modules/content/components/ResourceManager";
import { formatDateId } from "@/shared/lib/date";

/* Port `routes/admin.news.tsx` legacy — props, teks, dan markup kolom 1:1. */

interface NewsArticle {
  id: number;
  status: string;
  sort_order?: number;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  content?: string[];
  thumbnail_media_file_id?: number | null;
  published_at?: string | null;
}

export default function NewsAdminPage() {
  return (
    <ResourceManager<NewsArticle>
      resource="news"
      title="Berita"
      description="Kelola artikel dan update perusahaan untuk website publik."
      addLabel="Tambah Berita"
      itemLabel="berita"
      seoPath="/admin/news"
      imageField="thumbnail_media_file_id"
      searchPlaceholder="Cari judul, alamat halaman, atau ringkasan..."
      primaryText={(item) => item.title}
      secondaryText={(item) => item.excerpt}
      columns={[
        {
          label: "Artikel",
          value: (item) => (
            <div>
              <p className="font-semibold">{item.title}</p>
              <p className="line-clamp-1 text-xs text-muted-foreground">{item.excerpt}</p>
            </div>
          ),
        },
        { label: "Kategori", value: (item) => item.category },
        {
          label: "Publikasi",
          value: (item) => (item.published_at ? formatDateId(item.published_at, "short") : "-"),
        },
      ]}
      fields={[
        { name: "title", label: "Judul", required: true },
        {
          name: "slug",
          label: "Alamat Halaman",
          placeholder: "judul-berita",
          hint: "Opsional. Sistem akan membuat alamat otomatis dari judul.",
        },
        { name: "category", label: "Kategori", required: true },
        { name: "excerpt", label: "Ringkasan", type: "textarea", required: true },
        { name: "content", label: "Isi Berita", type: "paragraphs" },
        { name: "thumbnail_media_file_id", label: "Thumbnail", type: "media", usage: "news" },
        {
          name: "og_image_media_file_id",
          label: "Gambar Saat Dibagikan",
          type: "media",
          usage: "og",
        },
        { name: "seo_title", label: "Judul Google" },
        { name: "seo_description", label: "Deskripsi Google", type: "textarea" },
      ]}
    />
  );
}
