import { useLoaderData } from "react-router-dom";
import { OptionalImage } from "@/shared/components/ui/media-placeholder";
import { PageHero } from "@/shared/components/ui/page-hero";
import { useApiQuery } from "@/shared/hooks/useApiQuery";
import type { ContractSchemas } from "@/shared/types/contract";
import { Seo } from "@/modules/site/components/Seo";
import { PublicErrorState } from "@/modules/site/components/PublicErrorState";
import { siteService } from "@/modules/site/services/site.service";
import { fallbackFacilities } from "@/modules/site/lib/fallbacks";
import { PAGE_HERO, PAGE_SEO } from "@/modules/site/lib/page-copy";
import { FacilitiesContentSkeleton } from "@/modules/profile/components/FacilitiesSkeletons";

type PublicFacilities = ContractSchemas["PublicFacilities"];

/** Port 1:1 `FacilitiesPage` di `routes/_public.fasilitas.tsx` legacy. */
export default function FacilitiesPage() {
  const initialFacilities = useLoaderData() as PublicFacilities | null;
  const { data, error, loading, reload } = useApiQuery(
    ["public", "facilities"],
    () => siteService.facilities(),
    {
      initialData: initialFacilities,
      refetchOnMount: false,
    },
  );
  const facilities = data ?? fallbackFacilities;
  const displayedStrengths = facilities.strengths;
  const displayedMachines = facilities.machines;
  const displayedPrinting = facilities.printing_capacities;
  const displayedProduction = facilities.production_capacities;
  const displayedServices = facilities.services;
  const totalProduction = displayedProduction.reduce(
    (sum, item) => sum + Number(item.value.replace(".", "")),
    0,
  );

  return (
    <>
      <Seo {...PAGE_SEO.facilities} />
      <PageHero {...PAGE_HERO.facilities} image={displayedMachines[0]?.image_url ?? undefined} />
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {error && <PublicErrorState error={error} onRetry={reload} />}
          {loading && !data ? (
            <FacilitiesContentSkeleton />
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {displayedStrengths.map((s) => (
                  <div
                    key={s.label}
                    className="rounded-2xl border border-border bg-card p-6 shadow-card"
                  >
                    <div className="font-display text-3xl font-extrabold text-primary">
                      {s.value}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{s.suffix}</p>
                    <p className="mt-3 text-sm font-semibold">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-14 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-widest text-primary">
                        Kapasitas Produksi
                      </span>
                      <h2 className="mt-2 font-display text-2xl font-bold text-primary-deep">
                        Total {totalProduction.toLocaleString("id-ID")} pcs per bulan
                      </h2>
                    </div>
                    <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
                      Data CP Indobraga
                    </span>
                  </div>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {displayedProduction.map((item) => (
                      <div key={item.product} className="rounded-2xl bg-secondary p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {item.product}
                        </p>
                        <p className="mt-2 font-display text-3xl font-extrabold text-primary-deep">
                          {item.value}
                        </p>
                        <p className="text-xs text-muted-foreground">{item.unit}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl bg-gradient-hero p-6 text-primary-foreground shadow-elegant">
                  <span className="text-xs font-bold uppercase tracking-widest text-accent">
                    Printing, Sublimation, DTF
                  </span>
                  <h2 className="mt-2 font-display text-2xl font-bold">Atexco Model X Plus</h2>
                  <p className="mt-3 text-sm text-primary-foreground/75">
                    Mesin sublimasi berkapasitas besar untuk certified ink, consistent output, dan
                    kebutuhan produksi apparel skala bisnis.
                  </p>
                  <div className="mt-6 grid gap-3">
                    {displayedPrinting.map((item) => (
                      <div
                        key={item.label}
                        className="flex min-w-0 items-center gap-3 overflow-hidden rounded-2xl bg-white/10 p-3 ring-1 ring-white/10 sm:gap-4"
                      >
                        <OptionalImage
                          src={item.image_url}
                          alt={item.label}
                          className="h-16 w-16 shrink-0 rounded-xl object-cover ring-1 ring-white/15"
                          placeholderClassName="h-16 w-16 shrink-0 rounded-xl ring-1 ring-white/15"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                            {item.label}
                          </p>
                          <p className="truncate text-[11px] text-primary-foreground/70">
                            {item.description}
                          </p>
                          <p className="text-[11px] text-primary-foreground/60">{item.unit}</p>
                        </div>
                        <p className="shrink-0 font-display text-xl font-extrabold leading-none sm:text-2xl">
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-14 grid gap-8 md:grid-cols-2">
                {displayedMachines.map((m) => (
                  <article
                    key={m.id}
                    className="grid min-w-0 gap-5 overflow-hidden rounded-2xl bg-card shadow-card sm:grid-cols-[200px_1fr]"
                  >
                    <OptionalImage
                      src={m.image_url}
                      alt={m.name}
                      className="h-full min-h-48 w-full object-cover"
                      placeholderClassName="h-full min-h-48 w-full"
                    />
                    <div className="p-5 sm:pl-0">
                      <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-bold text-primary">
                        {m.metric}
                      </span>
                      <h3 className="mt-2 font-display text-xl font-bold">{m.name}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{m.description}</p>
                    </div>
                  </article>
                ))}
              </div>

              <div className="mt-14 rounded-3xl border border-border bg-card p-6 shadow-card">
                <span className="text-xs font-bold uppercase tracking-widest text-primary">
                  Apparel Manufacturing Services
                </span>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {displayedServices.map((service) => (
                    <div
                      key={service.name}
                      className="rounded-2xl bg-secondary px-4 py-3 text-sm font-semibold"
                    >
                      {service.name}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
