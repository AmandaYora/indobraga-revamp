import { ResourceManager } from "@/modules/content/components/ResourceManager";

/* Port `routes/admin.strength.tsx` legacy — props, teks, dan markup kolom 1:1. */

interface Strength {
  id: number;
  status: string;
  sort_order?: number;
  label: string;
  value: string;
  suffix?: string | null;
}

export default function StrengthAdminPage() {
  return (
    <ResourceManager<Strength>
      resource="production-strengths"
      title="Kekuatan Produksi"
      description="Kelola angka utama seperti kapasitas produksi, pengalaman, dan kapasitas printing."
      addLabel="Tambah Kekuatan"
      itemLabel="kekuatan"
      seoPath="/admin/strength"
      searchPlaceholder="Cari label kekuatan..."
      primaryText={(item) => item.label}
      secondaryText={(item) => `${item.value} ${item.suffix ?? ""}`}
      columns={[
        { label: "Label", value: (item) => <span className="font-semibold">{item.label}</span> },
        { label: "Nilai", value: (item) => item.value },
        { label: "Satuan", value: (item) => item.suffix ?? "-" },
        { label: "Urutan", value: (item) => item.sort_order ?? 0 },
      ]}
      fields={[
        { name: "label", label: "Label", required: true },
        { name: "value", label: "Nilai", required: true },
        { name: "suffix", label: "Satuan / Keterangan" },
        { name: "sort_order", label: "Urutan", type: "number" },
      ]}
      defaultValues={{ sort_order: 0, status: "published" }}
    />
  );
}
