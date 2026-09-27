import { ResourceManager } from "@/modules/content/components/ResourceManager";

interface HeroSection {
  id: number;
  status: string;
  title?: string | null;
  subtitle?: string | null;
  cta_label?: string | null;
  cta_href?: string | null;
}

interface HeroSlide {
  id: number;
  status: string;
  hero_section_id?: number | null;
  label?: string | null;
  title?: string | null;
  metric?: string | null;
  alt_text?: string | null;
  sort_order?: number | null;
  media_file_id?: number | null;
}

/** FE-C10: 2 manager (`hero`, `hero-slides`), `hero_section_id` tersembunyi. */
export default function HeroAdminPage() {
  return (
    <div className="space-y-10">
      <ResourceManager<HeroSection>
        resource="hero"
        title="Konten Beranda"
        description="Judul, subjudul, dan ajakan utama pada hero beranda."
        addLabel="Tambah hero"
        itemLabel="hero"
        seoPath="/admin/hero"
        fields={[
          { name: "title", label: "Judul", type: "text", required: true },
          { name: "subtitle", label: "Subjudul", type: "textarea" },
          { name: "cta_label", label: "Label tombol", type: "text" },
          { name: "cta_href", label: "Tautan tombol", type: "text", placeholder: "/kontak" },
        ]}
        columns={[
          { label: "Judul", value: (item) => item.title ?? "—" },
          { label: "Subjudul", value: (item) => item.subtitle ?? "—" },
        ]}
        primaryText={(item) => item.title ?? `Hero #${item.id}`}
      />
      <ResourceManager<HeroSlide>
        resource="hero-slides"
        title="Slide Hero"
        description="Dua gambar hero yang tampil bergantian di beranda."
        addLabel="Tambah slide"
        itemLabel="slide"
        seoPath="/admin/hero"
        defaultValues={{ hero_section_id: 0 }}
        fields={[
          { name: "hero_section_id", label: "ID seksi hero", type: "hidden" },
          { name: "label", label: "Label", type: "text", placeholder: "Garment" },
          { name: "title", label: "Judul", type: "text", required: true },
          { name: "metric", label: "Metrik", type: "text", placeholder: "90K pcs/bulan" },
          { name: "alt_text", label: "Teks alt", type: "text" },
          { name: "sort_order", label: "Urutan", type: "number" },
          { name: "media_file_id", label: "Gambar", type: "media", usage: "hero" },
        ]}
        columns={[
          { label: "Judul", value: (item) => item.title ?? "—" },
          { label: "Metrik", value: (item) => item.metric ?? "—" },
        ]}
        primaryText={(item) => item.title ?? `Slide #${item.id}`}
      />
    </div>
  );
}
