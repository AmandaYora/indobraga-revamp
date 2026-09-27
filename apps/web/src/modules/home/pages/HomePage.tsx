import { useRef } from "react";
import { Link, useLoaderData } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Factory,
  Printer,
  Sparkles,
  Truck,
} from "lucide-react";
import { OptionalImage } from "@/shared/components/ui/media-placeholder";
import { useApiQuery } from "@/shared/hooks/useApiQuery";
import { formatDateId } from "@/shared/lib/date";
import type { ContractSchemas } from "@/shared/types/contract";
import { Seo } from "@/modules/site/components/Seo";
import { PublicErrorState } from "@/modules/site/components/PublicErrorState";
import { siteService } from "@/modules/site/services/site.service";
import { fallbackHome } from "@/modules/site/lib/fallbacks";
import { PAGE_SEO } from "@/modules/site/lib/page-copy";
import {
  clientLogoSizeClass,
  fallbackHeroSlides,
  HERO_SUBTITLE_FALLBACK,
  trustedClientLogos,
  type ClientLogoSize,
  type HeroSlideView,
  type TrustedClientLogo,
} from "@/modules/home/lib/home-data";

type PublicHome = ContractSchemas["PublicHome"];

/** Port 1:1 `HomePage` di `routes/_public.index.tsx` legacy (hanya lapisan data yang diadaptasi). */
export default function HomePage() {
  const clientLogosRef = useRef<HTMLDivElement>(null);
  const initialHome = useLoaderData() as PublicHome | null;
  const { data, error, reload } = useApiQuery(["public", "home"], () => siteService.home(), {
    initialData: initialHome,
    refetchOnMount: false,
  });
  const home = data ?? fallbackHome;
  const apiHeroSlides: HeroSlideView[] =
    home.hero?.slides.map((slide) => ({
      label: slide.label ?? "",
      title: slide.title,
      metric: slide.metric ?? "",
      image: slide.image_url ?? null,
      alt: slide.alt_text ?? slide.title,
    })) ?? [];
  const heroSlides = apiHeroSlides.length > 0 ? apiHeroSlides : fallbackHeroSlides;
  const heroImageSlides = heroSlides.filter((slide) => Boolean(slide.image));
  const partnerLogos: TrustedClientLogo[] = home.partners.map((partner) => ({
    name: partner.name,
    image: partner.logo_url ?? "",
    size: "wide" as ClientLogoSize,
  }));
  const displayedClientLogos = partnerLogos.length > 0 ? partnerLogos : trustedClientLogos;
  const displayedStrengths = home.strengths;
  const displayedPortfolios = home.featured_portfolios;
  const displayedMachines = home.facilities_summary.machines;
  const displayedPrinting = home.facilities_summary.printing_capacities;
  const displayedServices = home.facilities_summary.services;
  const displayedNews = home.latest_news;

  const slideClientLogos = (direction: -1 | 1) => {
    const carousel = clientLogosRef.current;

    if (!carousel) {
      return;
    }

    carousel.scrollBy({
      left: direction * Math.min(carousel.clientWidth * 0.85, 760),
      behavior: "smooth",
    });
  };

  return (
    <>
      <Seo {...PAGE_SEO.home} />
      {error && (
        <section className="border-b border-border bg-background px-4 py-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <PublicErrorState error={error} onRetry={reload} />
          </div>
        </section>
      )}
      <section className="relative overflow-hidden bg-gradient-hero text-primary-foreground">
        <div className="absolute inset-0 opacity-35">
          {heroImageSlides.map((slide, index) => (
            <img
              key={slide.title}
              src={slide.image ?? ""}
              alt=""
              width={1344}
              height={960}
              fetchPriority={index === 0 ? "high" : undefined}
              className={`absolute inset-0 h-full w-full object-cover ${
                index === 0 ? "animate-hero-slide-one" : "animate-hero-slide-two"
              }`}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-r from-primary-deep via-primary-deep/80 to-primary-deep/30" />
        </div>
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 sm:py-18 md:py-20 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:px-8">
          <div className="min-w-0 animate-fade-up">
            <span className="text-anywhere inline-flex max-w-full flex-wrap items-center gap-2 rounded-md bg-accent/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-accent ring-1 ring-accent/30 sm:text-xs">
              <Sparkles className="h-3.5 w-3.5" /> Garment & sublim specialist sejak 2010
            </span>
            <h1 className="text-anywhere mt-5 max-w-2xl text-balance font-display text-3xl font-extrabold leading-[1.15] sm:text-[2.5rem] lg:text-5xl">
              Produksi <span className="text-accent">Garment</span> dan Sublim Skala Bisnis
            </h1>
            <p className="text-anywhere mt-5 max-w-2xl text-sm leading-7 text-primary-foreground/80 sm:text-base sm:leading-8 lg:text-[1.0625rem]">
              {home.hero?.subtitle ?? HERO_SUBTITLE_FALLBACK}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                to="/kontak"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-accent px-5 py-3 text-center text-sm font-bold leading-tight text-accent-foreground shadow-elegant transition hover:-translate-y-0.5 sm:w-auto sm:px-6"
              >
                Konsultasi Produksi <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/portfolio"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/30 px-5 py-3 text-center text-sm font-semibold leading-tight text-primary-foreground backdrop-blur transition hover:bg-white/10 sm:w-auto sm:px-6"
              >
                Lihat Portofolio
              </Link>
            </div>
            <div className="mt-10 grid max-w-xl grid-cols-3 gap-2 text-sm text-primary-foreground/80 sm:gap-3">
              {displayedStrengths.slice(0, 3).map(({ value, suffix }) => (
                <div
                  key={`${value}-${suffix}`}
                  className="rounded-xl border border-white/15 bg-white/10 p-2.5 backdrop-blur sm:p-3"
                >
                  <div className="text-anywhere font-display text-lg font-extrabold text-accent sm:text-xl">
                    {value}
                  </div>
                  <div className="text-anywhere mt-1 text-[10px] leading-tight sm:text-xs">
                    {suffix}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative hidden lg:block">
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-white/15 bg-white/10 shadow-elegant backdrop-blur">
              {heroImageSlides.length > 0 ? (
                heroImageSlides.map((slide, index) => (
                  <img
                    key={slide.title}
                    src={slide.image ?? ""}
                    alt={slide.alt}
                    width={1344}
                    height={960}
                    className={`absolute inset-0 h-full w-full object-cover ${
                      index === 0 ? "animate-hero-slide-one" : "animate-hero-slide-two"
                    }`}
                  />
                ))
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-white/12 via-white/5 to-primary-deep/30" />
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary-deep/90 to-transparent p-6">
                <div className="grid grid-cols-2 gap-3">
                  {heroSlides.map((slide) => (
                    <div
                      key={slide.title}
                      className="min-w-0 rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur"
                    >
                      <p className="text-anywhere text-xs font-semibold uppercase tracking-wider text-accent">
                        {slide.label}
                      </p>
                      <p className="mt-2 font-display text-2xl font-extrabold">{slide.title}</p>
                      <p className="mt-1 text-xs text-primary-foreground/75">{slide.metric}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-background py-12 sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-anywhere mx-auto max-w-3xl text-center font-display text-xl font-extrabold tracking-normal text-foreground sm:text-2xl">
            <span className="text-primary">Dipercaya oleh lebih dari 250+ bisnis</span> di berbagai
            industri.
          </p>
          <div className="relative mt-7">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-background to-transparent sm:w-12" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-background to-transparent sm:w-12" />
            <div
              ref={clientLogosRef}
              className="mx-auto overflow-x-auto scroll-smooth px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <div className="grid w-max grid-flow-col grid-rows-2 items-center gap-x-6 gap-y-4 py-2 sm:gap-x-8 sm:gap-y-5 lg:gap-x-10">
                {displayedClientLogos.map((client) => (
                  <div
                    key={client.name}
                    className="group flex h-16 w-[8.75rem] items-center justify-center px-2 sm:h-[4.75rem] sm:w-[8.5rem] lg:h-20 lg:w-[10rem]"
                  >
                    {client.image ? (
                      <img
                        src={client.image}
                        alt={client.name}
                        loading="lazy"
                        className={`${clientLogoSizeClass[client.size]} h-auto w-auto object-contain opacity-80 grayscale contrast-125 transition duration-300 group-hover:opacity-100 group-hover:grayscale-0`}
                      />
                    ) : (
                      <span className="text-center text-xs font-bold text-primary-deep/70">
                        {client.name}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              type="button"
              aria-label="Geser logo ke kiri"
              onClick={() => slideClientLogos(-1)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-primary shadow-card transition hover:border-primary/30 hover:bg-primary hover:text-primary-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Geser logo ke kanan"
              onClick={() => slideClientLogos(1)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-primary shadow-card transition hover:border-primary/30 hover:bg-primary hover:text-primary-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-primary">
              Kekuatan Produksi
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold text-primary-deep sm:text-4xl">
              Kapasitas produksi yang siap melayani kebutuhan bisnis Anda
            </h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {displayedStrengths.map((s, i) => (
              <div
                key={s.label}
                className="group rounded-2xl border border-border bg-card p-6 shadow-card transition hover:-translate-y-1 hover:shadow-elegant"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="font-display text-4xl font-extrabold text-primary">{s.value}</div>
                <div className="mt-1 text-xs font-medium text-muted-foreground">{s.suffix}</div>
                <div className="mt-4 border-t border-border pt-4 text-sm font-semibold text-foreground">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-soft py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-primary">
                Portofolio Produk
              </span>
              <h2 className="mt-3 font-display text-3xl font-bold text-primary-deep sm:text-4xl">
                Sportswear, corporate wear, dan merchandise multiproduk
              </h2>
            </div>
            <Link
              to="/portfolio"
              className="hidden items-center gap-1 text-sm font-semibold text-primary hover:text-primary-deep sm:inline-flex"
            >
              Lihat semua <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {displayedPortfolios.slice(0, 6).map((p) => (
              <article
                key={p.id}
                className="group overflow-hidden rounded-2xl bg-card shadow-card transition hover:shadow-elegant"
              >
                <div className="aspect-[4/3] overflow-hidden bg-muted">
                  <OptionalImage
                    src={p.medium_url ?? p.thumbnail_url}
                    alt={p.title}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    placeholderClassName="h-full w-full"
                  />
                </div>
                <div className="p-5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                    {p.category}
                  </span>
                  <h3 className="mt-1 font-display text-lg font-bold text-foreground">{p.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{p.short_description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-primary">
                Mesin & Fasilitas
              </span>
              <h2 className="mt-3 font-display text-3xl font-bold text-primary-deep sm:text-4xl">
                Custom fabric printing dengan Atexco Model X Plus
              </h2>
              <p className="mt-4 text-muted-foreground">
                Fasilitas produksi Indobraga mendukung full production package, CMT, pattern making,
                garment sample, printing, quality control, finishing, dan packing.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  { i: Printer, t: "Sublim, press, dan DTF" },
                  { i: BadgeCheck, t: "Certified ink dan output konsisten" },
                  { i: Factory, t: "90.000 pcs kapasitas bulanan" },
                  { i: Truck, t: "Siap untuk produksi multiproduk" },
                ].map(({ i: Icon, t }) => (
                  <div
                    key={t}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-medium">{t}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                {displayedServices.slice(0, 5).map((service) => (
                  <span
                    key={service.name}
                    className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground"
                  >
                    {service.name}
                  </span>
                ))}
              </div>
              <Link
                to="/fasilitas"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-card hover:bg-primary-deep"
              >
                Jelajahi Fasilitas <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {displayedPrinting.map((item) => (
                <div
                  key={item.label}
                  className="overflow-hidden rounded-2xl border border-border bg-card shadow-card"
                >
                  <OptionalImage
                    src={item.image_url}
                    alt={item.label}
                    className="aspect-[4/3] w-full object-cover"
                    placeholderClassName="aspect-[4/3] w-full"
                  />
                  <div className="p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                      {item.label}
                    </p>
                    <p className="mt-1 font-display text-2xl font-extrabold text-primary-deep">
                      {item.value}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.unit}</p>
                  </div>
                </div>
              ))}
              {displayedMachines.slice(0, 1).map((m) => (
                <div key={m.id} className="overflow-hidden rounded-2xl bg-card shadow-card">
                  <OptionalImage
                    src={m.image_url}
                    alt={m.name}
                    className="aspect-square w-full object-cover"
                    placeholderClassName="aspect-square w-full"
                  />
                  <div className="p-3">
                    <p className="text-xs font-semibold text-primary">{m.metric}</p>
                    <p className="text-sm font-bold text-foreground">{m.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gradient-soft py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-primary">
                Berita & Update
              </span>
              <h2 className="mt-3 font-display text-3xl font-bold text-primary-deep sm:text-4xl">
                Kabar terbaru dari Indobraga
              </h2>
            </div>
            <Link
              to="/berita?page=1"
              className="hidden text-sm font-semibold text-primary sm:inline-flex"
            >
              Lihat semua
            </Link>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {displayedNews.slice(0, 3).map((n) => (
              <article
                key={n.id}
                className="overflow-hidden rounded-2xl bg-card shadow-card transition hover:-translate-y-1 hover:shadow-elegant"
              >
                <OptionalImage
                  src={n.thumbnail_url}
                  alt={n.title}
                  className="aspect-[16/10] w-full object-cover"
                  placeholderClassName="aspect-[16/10] w-full"
                />
                <div className="p-5">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="rounded-full bg-accent/20 px-2.5 py-0.5 font-semibold text-accent-foreground">
                      {n.category}
                    </span>
                    <span className="text-muted-foreground">
                      {formatDateId(n.published_at ?? "", "long")}
                    </span>
                  </div>
                  <h3 className="mt-3 font-display text-lg font-bold text-foreground">{n.title}</h3>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{n.excerpt}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-hero p-10 text-center text-primary-foreground shadow-elegant md:p-16">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Siap memproduksi garment untuk bisnis Anda?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-primary-foreground/80">
              Tim kami siap berdiskusi tentang kebutuhan produksi, kapasitas, material, dan timeline
              yang Anda perlukan.
            </p>
            <Link
              to="/kontak"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-accent px-8 py-4 text-sm font-bold text-accent-foreground shadow-elegant transition-transform hover:scale-105"
            >
              Mulai Konsultasi <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
