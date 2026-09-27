import { Instagram, Mail, MapPin, Phone, UserRound } from "lucide-react";
import { PageHero } from "@/shared/components/ui/page-hero";
import { Seo } from "@/modules/site/components/Seo";
import { useSiteSettingsStore } from "@/modules/site/stores/site-settings.store";
import { PAGE_HERO, PAGE_SEO } from "@/modules/site/lib/page-copy";
import { InquiryForm } from "@/modules/leads/components/InquiryForm";

/**
 * Port 1:1 `ContactPage` di `routes/_public.kontak.tsx` legacy. Data kontak dari site settings
 * (bootstrap/API, BC-23) — setara loader `siteSettings()` legacy; tanpa pending skeleton.
 */
export default function ContactPage() {
  const settings = useSiteSettingsStore((state) => state.settings);

  const contactItems = [
    { icon: Mail, label: "Email", value: settings.email },
    { icon: Phone, label: "Telepon / WhatsApp", value: settings.phone },
    { icon: Instagram, label: "Instagram", value: `@${settings.instagram}` },
    { icon: UserRound, label: settings.contact_role, value: settings.contact_person },
    { icon: MapPin, label: "Kantor Marketing", value: settings.address },
  ];

  return (
    <>
      <Seo {...PAGE_SEO.contact} image={settings.contact_hero_image_url ?? undefined} />
      <PageHero {...PAGE_HERO.contact} image={settings.contact_hero_image_url ?? undefined} />
      <section className="py-16">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:px-8">
          <div className="space-y-6">
            <h2 className="font-display text-2xl font-bold text-primary-deep">Informasi Kontak</h2>
            {contactItems.map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="flex gap-4 rounded-2xl border border-border bg-card p-5 shadow-card"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {label}
                  </p>
                  <p className="text-sm font-medium">{value}</p>
                </div>
              </div>
            ))}
          </div>

          <InquiryForm />
        </div>
      </section>
    </>
  );
}
