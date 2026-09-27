import { ResourceManager } from "@/modules/content/components/ResourceManager";

interface Machine {
  id: number;
  status: string;
  name?: string | null;
  slug?: string | null;
  metric?: string | null;
  description?: string | null;
}

interface PrintingCapacity {
  id: number;
  status: string;
  label?: string | null;
  value?: string | null;
  unit?: string | null;
  description?: string | null;
}

interface ProductionCapacity {
  id: number;
  status: string;
  product?: string | null;
  value?: string | null;
  unit?: string | null;
}

/** FE-C13: 3 manager (mesin, kapasitas cetak, kapasitas produksi). */
export default function MachinesAdminPage() {
  return (
    <div className="space-y-10">
      <ResourceManager<Machine>
        resource="machines"
        title="Mesin & Area Produksi"
        description="Mesin dan area produksi pada halaman fasilitas."
        addLabel="Tambah mesin"
        itemLabel="mesin"
        seoPath="/admin/machines"
        fields={[
          { name: "name", label: "Nama", type: "text", required: true },
          {
            name: "slug",
            label: "Slug",
            type: "text",
            hint: "Otomatis dari nama bila dikosongkan.",
          },
          { name: "metric", label: "Metrik", type: "text", placeholder: "5.000 m/hari" },
          { name: "sort_order", label: "Urutan", type: "number" },
          { name: "description", label: "Deskripsi", type: "textarea" },
          { name: "media_file_id", label: "Gambar", type: "media", usage: "machine" },
        ]}
        columns={[
          { label: "Nama", value: (item) => item.name ?? "—" },
          { label: "Metrik", value: (item) => item.metric ?? "—" },
        ]}
        primaryText={(item) => item.name ?? `Mesin #${item.id}`}
      />
      <ResourceManager<PrintingCapacity>
        resource="printing-capacities"
        title="Kapasitas Cetak"
        description="Kapasitas sublim, press, dan DTF per hari."
        addLabel="Tambah kapasitas cetak"
        itemLabel="kapasitas cetak"
        seoPath="/admin/machines"
        fields={[
          { name: "label", label: "Label", type: "text", required: true },
          { name: "value", label: "Nilai", type: "text", required: true },
          {
            name: "unit",
            label: "Satuan",
            type: "text",
            required: true,
            placeholder: "meter / hari",
          },
          { name: "sort_order", label: "Urutan", type: "number" },
          { name: "description", label: "Deskripsi", type: "textarea" },
          { name: "media_file_id", label: "Gambar", type: "media", usage: "machine" },
        ]}
        columns={[
          { label: "Label", value: (item) => item.label ?? "—" },
          { label: "Nilai", value: (item) => `${item.value ?? "—"} ${item.unit ?? ""}` },
        ]}
        primaryText={(item) => item.label ?? `Kapasitas #${item.id}`}
      />
      <ResourceManager<ProductionCapacity>
        resource="production-capacities"
        title="Kapasitas Produksi"
        description="Kapasitas produksi bulanan per kategori produk."
        addLabel="Tambah kapasitas produksi"
        itemLabel="kapasitas produksi"
        seoPath="/admin/machines"
        fields={[
          { name: "product", label: "Produk", type: "text", required: true },
          { name: "value", label: "Nilai", type: "text", required: true },
          {
            name: "unit",
            label: "Satuan",
            type: "text",
            required: true,
            placeholder: "pcs / bulan",
          },
          { name: "sort_order", label: "Urutan", type: "number" },
        ]}
        columns={[
          { label: "Produk", value: (item) => item.product ?? "—" },
          { label: "Nilai", value: (item) => `${item.value ?? "—"} ${item.unit ?? ""}` },
        ]}
        primaryText={(item) => item.product ?? `Kapasitas #${item.id}`}
      />
    </div>
  );
}
