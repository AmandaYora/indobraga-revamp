import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { BrandLogo } from "@/modules/site";
import { useSiteSettingsStore } from "@/modules/site";
import { cn } from "@/shared/lib/cn";

const NAV_ITEMS = [
  { label: "Beranda", to: "/" },
  { label: "Portofolio", to: "/portfolio" },
  { label: "Fasilitas", to: "/fasilitas" },
  { label: "Galeri", to: "/galeri" },
  { label: "Berita", to: "/berita" },
  { label: "Kontak", to: "/kontak" },
];

export function SiteHeader() {
  const settings = useSiteSettingsStore((state) => state.settings);
  const [open, setOpen] = useState(false);
  const brand = settings.brand ?? "Indobraga";
  const showBrandText = !settings.logo_url || settings.show_brand_text !== false;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" aria-label="Beranda Indobraga">
          <BrandLogo brand={brand} logoUrl={settings.logo_url} showText={showBrandText} />
        </Link>
        <nav aria-label="Navigasi utama" className="hidden items-center gap-8 text-sm md:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "transition-colors hover:text-primary",
                  isActive ? "font-semibold text-primary" : "text-foreground",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
          <Link
            to="/kontak"
            className="rounded-full bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90"
          >
            Konsultasi Produksi
          </Link>
        </nav>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg md:hidden"
          aria-expanded={open}
          aria-label={open ? "Tutup menu" : "Buka menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open ? (
        <nav aria-label="Navigasi seluler" className="border-t md:hidden">
          <div className="space-y-1 px-4 py-3">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "block rounded-lg px-3 py-2 text-sm",
                    isActive ? "bg-primary-soft font-semibold text-primary" : "hover:bg-muted",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
            <Link
              to="/kontak"
              onClick={() => setOpen(false)}
              className="mt-2 block rounded-full bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground"
            >
              Konsultasi Produksi
            </Link>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
