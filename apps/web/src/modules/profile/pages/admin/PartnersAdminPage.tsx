import { ResourceManager } from "@/modules/content/components/ResourceManager";

interface Partner {
  id: number;
  status: string;
  name?: string | null;
  segment?: string | null;
  sort_order?: number | null;
}

/** FE-C11: manager tunggal logo klien. */
export default function PartnersAdminPage() {
  return (
    <ResourceManager<Partner>
      resource="partners"
      title="Logo Klien"
      description="Daftar klien yang tampil pada strip logo beranda."
      addLabel="Tambah klien"
      itemLabel="klien"
      seoPath="/admin/partners"
      imageField="logo_media_id"
      fields={[
        { name: "name", label: "Nama", type: "text", required: true },
        { name: "segment", label: "Segmen", type: "text", placeholder: "Klub Sepak Bola" },
        { name: "sort_order", label: "Urutan", type: "number" },
        { name: "logo_media_id", label: "Logo", type: "media", usage: "partner" },
      ]}
      columns={[
        { label: "Nama", value: (item) => item.name ?? "—" },
        { label: "Segmen", value: (item) => item.segment ?? "—" },
      ]}
      primaryText={(item) => item.name ?? `Klien #${item.id}`}
    />
  );
}
