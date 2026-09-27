import { ResourceManager } from "@/modules/content/components/ResourceManager";

interface PortfolioCategory {
  id: number;
  status: string;
  name?: string | null;
  slug?: string | null;
}

/** FE-C11: manager tunggal kategori portofolio. */
export default function PortfolioCategoriesAdminPage() {
  return (
    <ResourceManager<PortfolioCategory>
      resource="portfolio-categories"
      title="Kategori Portofolio"
      description="Kategori untuk filter portofolio publik, mis. Jersey."
      addLabel="Tambah kategori"
      itemLabel="kategori"
      seoPath="/admin/portfolio-categories"
      fields={[
        {
          name: "name",
          label: "Nama",
          type: "text",
          required: true,
          placeholder: "Contoh: Jersey",
        },
        { name: "slug", label: "Slug", type: "text", hint: "Otomatis dari nama bila dikosongkan." },
        { name: "sort_order", label: "Urutan", type: "number" },
      ]}
      columns={[{ label: "Nama", value: (item) => item.name ?? "—" }]}
      primaryText={(item) => item.name ?? `Kategori #${item.id}`}
    />
  );
}
