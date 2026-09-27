import { ResourceManager } from "@/modules/content/components/ResourceManager";

interface Strength {
  id: number;
  status: string;
  label?: string | null;
  value?: string | null;
  suffix?: string | null;
}

/** FE-C11: manager tunggal keunggulan produksi. */
export default function StrengthAdminPage() {
  return (
    <ResourceManager<Strength>
      resource="production-strengths"
      title="Kekuatan Produksi"
      description="Empat tile statistik pada beranda dan halaman fasilitas."
      addLabel="Tambah keunggulan"
      itemLabel="keunggulan"
      seoPath="/admin/strength"
      fields={[
        { name: "label", label: "Label", type: "text", required: true },
        { name: "value", label: "Nilai", type: "text", required: true, placeholder: "90K" },
        { name: "suffix", label: "Satuan", type: "text", placeholder: "pcs / bulan" },
        { name: "sort_order", label: "Urutan", type: "number" },
      ]}
      columns={[
        { label: "Label", value: (item) => item.label ?? "—" },
        {
          label: "Nilai",
          value: (item) => `${item.value ?? "—"}${item.suffix ? ` ${item.suffix}` : ""}`,
        },
      ]}
      primaryText={(item) => item.label ?? `Keunggulan #${item.id}`}
    />
  );
}
