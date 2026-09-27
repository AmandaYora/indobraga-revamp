import { ResourceManager } from "@/modules/content/components/ResourceManager";

interface ServiceItem {
  id: number;
  status: string;
  name?: string | null;
}

/** FE-C11: manager tunggal daftar layanan. */
export default function ServicesAdminPage() {
  return (
    <ResourceManager<ServiceItem>
      resource="services"
      title="Daftar Layanan"
      description="Layanan apparel manufacturing yang tampil di beranda dan fasilitas."
      addLabel="Tambah layanan"
      itemLabel="layanan"
      seoPath="/admin/services"
      fields={[
        { name: "name", label: "Nama", type: "text", required: true },
        { name: "sort_order", label: "Urutan", type: "number" },
      ]}
      columns={[{ label: "Nama", value: (item) => item.name ?? "—" }]}
      primaryText={(item) => item.name ?? `Layanan #${item.id}`}
    />
  );
}
