import { ResourceManager } from "@/modules/content/components/ResourceManager";
import { useApiQuery } from "@/shared/hooks/useApiQuery";
import { siteService } from "@/modules/site";
import { ErrorState, LoadingState } from "@/shared/components/feedback/states";

interface Portfolio {
  id: number;
  status: string;
  title?: string | null;
  slug?: string | null;
  category_id?: number | null;
  category?: string | null;
  short_description?: string | null;
  is_featured?: boolean | null;
}

/**
 * FE-C12: select kategori dari API, media-multi maks 10 + urut panah +
 * gambar pertama = cover, featured, field SEO.
 */
export default function PortfolioAdminPage() {
  const { data, error, loading, reload } = useApiQuery(
    ["admin", "portfolio-categories", "options"],
    () => siteService.portfolioCategories(),
  );

  if (loading && !data) return <LoadingState label="Memuat kategori..." />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;

  const categoryOptions = (data?.items ?? []).map((category) => ({
    value: category.id,
    label: category.name,
  }));

  return (
    <ResourceManager<Portfolio>
      resource="portfolios"
      title="Portofolio Produk"
      description="Kelola hasil produksi yang tampil di halaman portofolio."
      addLabel="Tambah portofolio"
      itemLabel="portofolio"
      seoPath="/admin/portfolio"
      searchPlaceholder="Cari portofolio..."
      fields={[
        { name: "title", label: "Judul", type: "text", required: true },
        {
          name: "slug",
          label: "Slug",
          type: "text",
          hint: "Otomatis dari judul bila dikosongkan.",
        },
        {
          name: "category_id",
          label: "Kategori",
          type: "select",
          required: true,
          valueType: "number",
          options: categoryOptions,
          hint: "Isi kategori terlebih dahulu bila daftar masih kosong.",
        },
        { name: "sort_order", label: "Urutan", type: "number" },
        { name: "short_description", label: "Deskripsi singkat", type: "textarea", required: true },
        {
          name: "media_file_ids",
          label: "Gambar",
          type: "media-multi",
          usage: "portfolio",
          max: 10,
          hint: "Maksimal 10 gambar. Gambar pertama menjadi sampul katalog; urutkan dengan tombol panah.",
        },
        { name: "is_featured", label: "Unggulan", type: "checkbox", hint: "Tampilkan di Beranda" },
        { name: "seo_title", label: "Judul SEO", type: "text" },
        { name: "seo_description", label: "Deskripsi SEO", type: "textarea" },
      ]}
      columns={[
        { label: "Judul", value: (item) => item.title ?? "—" },
        { label: "Kategori", value: (item) => item.category ?? "—" },
      ]}
      primaryText={(item) => item.title ?? `Portofolio #${item.id}`}
      secondaryText={(item) => (item.is_featured ? "Unggulan di Beranda" : null)}
    />
  );
}
