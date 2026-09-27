import { ResourceManager } from "@/modules/content/components/ResourceManager";

/* Port `routes/admin.services.tsx` legacy — props, teks, dan markup kolom 1:1. */

interface ServiceItem {
  id: number;
  status: string;
  name: string;
  sort_order?: number;
}

export default function ServicesAdminPage() {
  return (
    <ResourceManager<ServiceItem>
      resource="services"
      title="Layanan"
      description="Kelola daftar layanan yang ditampilkan pada website publik."
      addLabel="Tambah Layanan"
      itemLabel="layanan"
      seoPath="/admin/services"
      searchPlaceholder="Cari layanan..."
      primaryText={(item) => item.name}
      columns={[
        {
          label: "Nama Layanan",
          value: (item) => <span className="font-semibold">{item.name}</span>,
        },
        { label: "Urutan", value: (item) => item.sort_order ?? 0 },
      ]}
      fields={[
        { name: "name", label: "Nama Layanan", required: true },
        { name: "sort_order", label: "Urutan", type: "number" },
      ]}
      defaultValues={{ sort_order: 0, status: "published" }}
    />
  );
}
