import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { HomeDynamicSectionsSkeleton } from "@/modules/site/components/PublicSkeletons";
import { strengths } from "@/modules/site/lib/site-data";
import { fallbackHeroSlides } from "@/modules/home/lib/home-data";

/** Port 1:1 `HomePendingPage` di `routes/_public.index.tsx` legacy. */
export function HomePendingPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-hero text-primary-foreground">
        <div className="absolute inset-0 opacity-70">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-deep via-primary-deep/80 to-primary-deep/30" />
        </div>
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 sm:py-18 md:py-20 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:px-8">
          <div className="min-w-0">
            <span className="text-anywhere inline-flex max-w-full flex-wrap items-center gap-2 rounded-md bg-accent/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-accent ring-1 ring-accent/30 sm:text-xs">
              <Sparkles className="h-3.5 w-3.5" /> Garment & sublim specialist sejak 2010
            </span>
            <h1 className="text-anywhere mt-5 max-w-2xl text-balance font-display text-3xl font-extrabold leading-[1.15] sm:text-[2.5rem] lg:text-5xl">
              Produksi <span className="text-accent">Garment</span> dan Sublim Skala Bisnis
            </h1>
            <p className="text-anywhere mt-5 max-w-2xl text-sm leading-7 text-primary-foreground/80 sm:text-base sm:leading-8 lg:text-[1.0625rem]">
              Indobraga membantu brand, komunitas, dan perusahaan memproduksi apparel siap pakai,
              mulai dari pattern, cutting, sewing, hingga sublimasi kain dengan output konsisten.
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
              {strengths.slice(0, 3).map(({ value, suffix }) => (
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
              <div className="absolute inset-0 grid place-items-center p-8">
                <div className="grid w-full grid-cols-2 gap-3">
                  {fallbackHeroSlides.map((slide) => (
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
      <HomeDynamicSectionsSkeleton />
    </>
  );
}
