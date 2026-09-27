import { ResourceManager } from "@/modules/content/components/ResourceManager";

/* Port `routes/admin.portfolio-categories.tsx` legacy — props, teks, dan markup kolom 1:1. */

interface PortfolioCategory {
  id: number;
  status: string;
  name: string;
  slug: string;
  sort_order?: number;
}

export default function PortfolioCategoriesAdminPage() {
  return (
    <ResourceManager<PortfolioCategory>
      resource="portfolio-categories"
      title="Kategori Portofolio"
      description="Kelola kelompok produk yang dipakai sebagai filter portofolio publik."
      addLabel="Tambah Kategori"
      itemLabel="kategori"
      seoPath="/admin/portfolio-categories"
      searchPlaceholder="Cari nama kategori..."
      primaryText={(item) => item.name}
      secondaryText={(item) => item.slug}
      columns={[
        {
          label: "Kategori",
          value: (item) => (
            <div>
              <p className="font-semibold">{item.name}</p>
              <p className="text-xs text-muted-foreground">/{item.slug}</p>
            </div>
          ),
        },
        { label: "Urutan", value: (item) => item.sort_order ?? 0 },
      ]}
      fields={[
        {
          name: "name",
          label: "Nama Kategori",
          required: true,
          placeholder: "Contoh: Jersey",
        },
        {
          name: "slug",
          label: "Alamat Halaman Kategori",
          placeholder: "jersey",
          hint: "Opsional. Sistem akan membuat alamat halaman otomatis dari nama kategori.",
        },
        { name: "sort_order", label: "Urutan Tampil", type: "number" },
      ]}
      defaultValues={{ sort_order: 0, status: "published" }}
    />
  );
}
