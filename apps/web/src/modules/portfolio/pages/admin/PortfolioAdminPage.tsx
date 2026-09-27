import { ResourceManager } from "@/modules/content/components/ResourceManager";
import { contentService } from "@/modules/content";
import { useApiQuery } from "@/shared/hooks/useApiQuery";

/*
 * Port `routes/admin.portfolio.tsx` legacy — props, teks, dan markup kolom 1:1.
 * Opsi kategori dimuat seperti legacy (daftar admin `portfolio-categories`
 * published, limit 100) tanpa memblokir render: placeholder "Memuat kategori..."
 * selama loading, galat diabaikan (opsi kosong → hint "Tambahkan kategori...").
 */

interface Portfolio {
  id: number;
  status: string;
  sort_order?: number;
  title: string;
  slug: string;
  category_id?: number | null;
  category?: string | null;
  category_slug?: string | null;
  short_description?: string | null;
  media_file_id?: number | null;
  media_file_ids?: number[];
  is_featured?: boolean;
}

interface PortfolioCategoryOption {
  id: number;
  status?: string;
  name: string;
}

export default function PortfolioAdminPage() {
  const categories = useApiQuery(["admin", "portfolio-categories", "options"], () =>
    contentService.list<PortfolioCategoryOption>("portfolio-categories", {
      status: "published",
      limit: 100,
    }),
  );
  const categoryOptions =
    categories.data?.items.map((category) => ({
      value: String(category.id),
      label: category.name,
    })) ?? [];

  return (
    <ResourceManager<Portfolio>
      resource="portfolios"
      title="Portofolio Produk"
      description="Kelola katalog hasil produksi untuk website publik."
      addLabel="Tambah Portofolio"
      itemLabel="portofolio"
      seoPath="/admin/portfolio"
      imageField="media_file_id"
      searchPlaceholder="Cari judul, kategori, atau deskripsi..."
      primaryText={(item) => item.title}
      secondaryText={(item) => (
        <>
          <span className="font-semibold text-primary">{item.category}</span>
          {item.short_description && <span> - {item.short_description}</span>}
        </>
      )}
      columns={[
        {
          label: "Produk",
          value: (item) => (
            <div>
              <p className="font-semibold">{item.title}</p>
              <p className="line-clamp-1 text-xs text-muted-foreground">{item.short_description}</p>
            </div>
          ),
        },
        { label: "Kategori", value: (item) => item.category },
        { label: "Alamat Halaman", value: (item) => <span className="text-xs">/{item.slug}</span> },
      ]}
      fields={[
        { name: "title", label: "Judul Produk", required: true },
        {
          name: "slug",
          label: "Alamat Halaman",
          placeholder: "training-jersey-klub",
          hint: "Opsional. Sistem akan membuat alamat halaman otomatis dari judul produk.",
        },
        {
          name: "category_id",
          label: "Kategori Produk",
          type: "select",
          required: true,
          placeholder: categories.loading ? "Memuat kategori..." : "Pilih kategori",
          hint:
            categoryOptions.length === 0
              ? "Tambahkan kategori portofolio terlebih dahulu agar produk bisa dikelompokkan."
              : "Kategori ini menjadi filter pada halaman portofolio publik.",
          options: categoryOptions,
          valueType: "number",
        },
        { name: "sort_order", label: "Urutan", type: "number" },
        {
          name: "short_description",
          label: "Deskripsi Singkat",
          type: "textarea",
          required: true,
        },
        {
          name: "media_file_ids",
          label: "Gambar Produk",
          type: "media-multi",
          usage: "portfolio",
          max: 10,
          hint: "Bisa lebih dari satu (maksimal 10). Gambar pertama menjadi sampul di katalog publik.",
        },
        { name: "is_featured", label: "Tampilkan di Beranda", type: "checkbox" },
        { name: "seo_title", label: "Judul Google" },
        { name: "seo_description", label: "Deskripsi Google", type: "textarea" },
      ]}
      defaultValues={{ sort_order: 0, is_featured: false }}
    />
  );
}
