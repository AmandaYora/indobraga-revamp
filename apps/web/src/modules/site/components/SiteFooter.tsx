import { Link } from "react-router-dom";
import { BrandLogo } from "@/modules/site";
import { useSiteSettingsStore } from "@/modules/site";

const EXPLORE_LINKS = [
  { label: "Portofolio Produk", to: "/portfolio" },
  { label: "Mesin & Fasilitas", to: "/fasilitas" },
  { label: "Berita Perusahaan", to: "/berita?page=1" },
  { label: "Hubungi Kami", to: "/kontak" },
];

export function SiteFooter() {
  const settings = useSiteSettingsStore((state) => state.settings);
  const brand = settings.brand ?? "Indobraga";
  const legalName = settings.legal_name ?? "PT. Braga Indonesia Perkasa";
  const year = new Date().getFullYear();

  return (
    <footer className="bg-primary-deep text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div>
          <BrandLogo
            brand={brand}
            logoUrl={settings.footer_logo_url ?? settings.logo_url}
            textClassName="text-white"
          />
          <p className="mt-4 text-sm text-white/70">
            {legalName} - mitra apparel manufacturing, garment production, cetak kain custom, dan
            multiproduct facility asal Indonesia.
          </p>
        </div>
        <nav aria-label="Jelajahi">
          <p className="font-semibold">Jelajahi</p>
          <ul className="mt-4 space-y-2 text-sm text-white/70">
            {EXPLORE_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="hover:text-accent">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <p className="font-semibold">Kontak</p>
          <ul className="mt-4 space-y-2 text-sm text-white/70">
            {settings.email ? <li>{settings.email}</li> : null}
            {settings.phone ? <li>{settings.phone}</li> : null}
            {settings.instagram ? <li>@{settings.instagram}</li> : null}
            {settings.contact_person ? (
              <li>
                {settings.contact_person}
                {settings.contact_role ? ` — ${settings.contact_role}` : null}
              </li>
            ) : null}
            {settings.address ? <li>{settings.address}</li> : null}
          </ul>
        </div>
        <div>
          <p className="font-semibold">Jam Operasional</p>
          <p className="mt-4 text-sm text-white/70">
            Senin – Sabtu
            <br />
            08.00 – 17.00 WIB
          </p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-7xl px-4 py-4 text-center text-xs text-white/60 sm:px-6">
          Copyright {year} {legalName}. Hak cipta dilindungi.
        </p>
      </div>
    </footer>
  );
}
