import { Link } from "react-router-dom";
import { useLoaderData } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import { Seo } from "@/modules/site";
import { OptionalImage } from "@/shared/components/ui/media-placeholder";
import { useApiQuery } from "@/shared/hooks/useApiQuery";
import { siteService, fallbackHome } from "@/modules/site";
import { formatDateId } from "@/shared/lib/date";
import type { ContractSchemas } from "@/shared/types/contract";
import { HomePendingPage } from "@/modules/home/components/HomeSkeletons";

function PartnerCarousel({ partners }: { partners: { id: number; name: string }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  function scroll(direction: -1 | 1) {
    const node = ref.current;
    if (!node) return;
    node.scrollBy({ left: direction * Math.min(node.clientWidth * 0.85, 760), behavior: "smooth" });
  }
  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-background to-transparent" />
      <div
        ref={ref}
        className="grid auto-cols-max grid-flow-col grid-rows-2 gap-x-10 gap-y-6 overflow-x-auto px-12 pb-2"
      >
        {partners.map((partner) => (
          <span
            key={partner.id}
            className="whitespace-nowrap text-lg font-semibold text-muted-foreground grayscale contrast-125 transition hover:text-foreground hover:grayscale-0"
          >
            {partner.name}
          </span>
        ))}
      </div>
      <button
        type="button"
        aria-label="Geser logo ke kiri"
        onClick={() => scroll(-1)}
        className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full border bg-background p-2 shadow-card"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="Geser logo ke kanan"
        onClick={() => scroll(1)}
        className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full border bg-background p-2 shadow-card"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function HomePage() {
  const loaderData = useLoaderData() as ContractSchemas["PublicHome"] | null;
  const { data, loading } = useApiQuery(["public", "home"], () => siteService.home(), {
    initialData: loaderData ?? fallbackHome,
    refetchOnMount: false,
  });
  const home = data ?? fallbackHome;

  if (loading && !data) return <HomePendingPage />;

  const slides = home.hero.slides.length > 0 ? home.hero.slides : fallbackHome.hero.slides;
  const heroImage =
    (slides[0] as { media?: { medium_url?: string | null } | null })?.media?.medium_url ?? null;

  return (
    <>
      <Seo title={home.hero.title} description={home.hero.subtitle} path="/" image={heroImage} />
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="absolute inset-0" aria-hidden="true">
          {slides.slice(0, 2).map((slide, index) => (
            <div
              key={slide.id}
              className={
                index === 0
                  ? "animate-hero-slide-one absolute inset-0"
                  : "animate-hero-slide-two absolute inset-0"
              }
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-r from-primary-deep via-primary-deep/70 to-transparent" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="animate-fade-up inline-block rounded-full border border-white/20 px-4 py-1 text-sm text-white/90">
            Garment &amp; sublim specialist sejak 2010
          </p>
          <h1 className="animate-fade-up mt-4 max-w-2xl text-balance text-4xl font-bold text-white sm:text-5xl">
            {home.hero.title ?? "Produksi Garment dan Sublim Skala Bisnis"}
          </h1>
          {home.hero.subtitle ? (
            <p className="animate-fade-up mt-4 max-w-xl text-anywhere text-white/80">
              {home.hero.subtitle}
            </p>
          ) : null}
          <div className="animate-fade-up mt-8 flex flex-wrap gap-3">
            <Link
              to={home.hero.primary_cta?.url ?? "/kontak"}
              className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90"
            >
              {home.hero.primary_cta?.label ?? "Konsultasi Produksi"}
            </Link>
            <Link
              to="/portfolio"
              className="rounded-full border border-white/30 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
            >
              Lihat Portofolio
            </Link>
          </div>
        </div>
      </section>

      {/* Strip logo */}
      <section className="border-b py-10">
        <p className="text-center text-sm text-muted-foreground">
          Dipercaya oleh lebih dari 250+ bisnis di berbagai industri.
        </p>
        <div className="mx-auto mt-6 max-w-7xl px-4 sm:px-6">
          <PartnerCarousel
            partners={home.partners.map((partner) => ({ id: partner.id, name: partner.name }))}
          />
        </div>
      </section>

      {/* Kekuatan produksi */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="text-balance text-2xl font-bold sm:text-3xl">Kekuatan Produksi</h2>
        <p className="mt-2 text-muted-foreground">
          Kapasitas produksi yang siap melayani kebutuhan bisnis Anda
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {home.strengths.map((strength) => (
            <div key={strength.id} className="rounded-2xl border bg-card p-6 shadow-card">
              <p className="text-3xl font-bold text-primary">
                {strength.value}
                {strength.suffix ? (
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    {strength.suffix}
                  </span>
                ) : null}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{strength.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Portofolio unggulan */}
      <section className="bg-gradient-soft py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-balance text-2xl font-bold sm:text-3xl">Portofolio Produk</h2>
              <p className="mt-2 text-muted-foreground">
                Sportswear, corporate wear, dan merchandise multiproduk
              </p>
            </div>
            <Link
              to="/portfolio"
              className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary"
            >
              Lihat semua <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {home.featured_portfolios.slice(0, 6).map((item) => (
              <Link
                key={item.id}
                to="/portfolio"
                className="group overflow-hidden rounded-2xl border bg-card shadow-card"
              >
                <OptionalImage
                  src={item.cover_image?.medium_url ?? item.cover_image?.thumbnail_url ?? null}
                  alt={item.title}
                  className="aspect-[4/3] w-full object-cover transition group-hover:scale-105"
                />
                <div className="p-4">
                  <p className="font-semibold">{item.title}</p>
                  {item.short_description ? (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {item.short_description}
                    </p>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Mesin & fasilitas */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="text-balance text-2xl font-bold sm:text-3xl">Mesin &amp; Fasilitas</h2>
        <p className="mt-2 text-muted-foreground">
          Custom fabric printing dengan Atexco Model X Plus
        </p>
        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {home.facilities_summary.machines.map((machine) => (
            <li key={machine.id} className="rounded-2xl border bg-card p-6 shadow-card">
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                {machine.metric}
              </p>
              <p className="mt-1 font-semibold">{machine.name}</p>
              {machine.description ? (
                <p className="mt-2 text-sm text-muted-foreground">{machine.description}</p>
              ) : null}
            </li>
          ))}
        </ul>
        <ul className="mt-6 space-y-2">
          {[
            "Sublim, press, dan DTF",
            "Certified ink dan output konsisten",
            "90.000 pcs kapasitas bulanan",
            "Siap untuk produksi multiproduk",
          ].map((item) => (
            <li key={item} className="flex items-center gap-2 text-sm">
              <span aria-hidden="true" className="text-success-strong">
                ✓
              </span>{" "}
              {item}
            </li>
          ))}
        </ul>
        <Link
          to="/fasilitas"
          className="mt-6 inline-flex items-center gap-1 rounded-full border px-5 py-2 text-sm font-medium hover:bg-muted"
        >
          Jelajahi Fasilitas <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      {/* Berita terbaru */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-balance text-2xl font-bold sm:text-3xl">Berita &amp; Update</h2>
            <p className="mt-2 text-muted-foreground">Kabar terbaru dari Indobraga</p>
          </div>
          <Link
            to="/berita"
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary"
          >
            Lihat semua <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {home.latest_news.slice(0, 3).map((item) => (
            <Link
              key={item.id}
              to={`/berita/${item.slug}`}
              className="overflow-hidden rounded-2xl border bg-card shadow-card"
            >
              <OptionalImage
                src={item.thumbnail?.medium_url ?? item.thumbnail?.thumbnail_url ?? null}
                alt={item.title}
                className="aspect-[16/9] w-full object-cover"
              />
              <div className="p-4">
                <p className="text-xs uppercase tracking-wide text-primary">{item.category}</p>
                <p className="mt-1 font-semibold">{item.title}</p>
                {item.published_at ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatDateId(item.published_at, "short")}
                  </p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-hero py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-balance text-2xl font-bold text-white sm:text-3xl">
            Siap memproduksi garment untuk bisnis Anda?
          </h2>
          <p className="mt-2 text-white/80">
            Tim kami siap berdiskusi tentang kebutuhan produksi Anda.
          </p>
          <Link
            to="/kontak"
            className="mt-6 inline-block rounded-full bg-accent px-8 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90"
          >
            Mulai Konsultasi
          </Link>
        </div>
      </section>
    </>
  );
}
