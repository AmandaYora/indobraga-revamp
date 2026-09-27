import { PageHero } from "@/shared/components/ui/page-hero";
import { Seo } from "@/modules/site";
import { InquiryForm } from "@/modules/leads";
import { useSiteSettingsStore } from "@/modules/site";

export default function ContactPage() {
  const settings = useSiteSettingsStore((state) => state.settings);

  return (
    <>
      <Seo
        title="Kontak"
        description="Mari bicarakan kebutuhan produksi Anda dengan tim marketing Indobraga."
        path="/kontak"
        image={settings.contact_hero_image_url}
      />
      <PageHero
        kicker="Kontak"
        title="Mari bicarakan kebutuhan produksi Anda"
        subtitle="Tim marketing kami siap membantu merencanakan produksi garment dan merchandise Anda."
        image={settings.contact_hero_image_url}
      />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2">
        <section aria-label="Informasi kontak">
          <h2 className="text-xl font-bold">Informasi Kontak</h2>
          <dl className="mt-4 space-y-3 text-sm">
            {settings.email ? (
              <div>
                <dt className="font-medium">Email</dt>
                <dd className="text-muted-foreground">{settings.email}</dd>
              </div>
            ) : null}
            {settings.phone ? (
              <div>
                <dt className="font-medium">Telepon / WhatsApp</dt>
                <dd className="text-muted-foreground">{settings.phone}</dd>
              </div>
            ) : null}
            {settings.instagram ? (
              <div>
                <dt className="font-medium">Instagram</dt>
                <dd className="text-muted-foreground">@{settings.instagram}</dd>
              </div>
            ) : null}
            {settings.contact_person ? (
              <div>
                <dt className="font-medium">{settings.contact_role ?? "Kontak"}</dt>
                <dd className="text-muted-foreground">{settings.contact_person}</dd>
              </div>
            ) : null}
            {settings.address ? (
              <div>
                <dt className="font-medium">Kantor Marketing</dt>
                <dd className="text-muted-foreground">{settings.address}</dd>
              </div>
            ) : null}
          </dl>
        </section>
        <section aria-label="Formulir pesan" className="rounded-2xl border bg-card p-6 shadow-card">
          <h2 className="text-xl font-bold">Kirim Pesan</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Isi form di bawah, kami akan segera menghubungi Anda.
          </p>
          <div className="mt-4">
            <InquiryForm />
          </div>
        </section>
      </div>
    </>
  );
}
