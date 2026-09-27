import { useLoaderData } from "react-router-dom";
import { PageHero } from "@/shared/components/ui/page-hero";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Seo } from "@/modules/site";
import { useApiQuery } from "@/shared/hooks/useApiQuery";
import { siteService } from "@/modules/site";
import { fallbackFacilities } from "@/modules/site/lib/fallbacks";
import type { ContractSchemas } from "@/shared/types/contract";

export function FacilitiesContentSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto max-w-7xl space-y-8 px-4 py-12 sm:px-6"
    >
      <span className="sr-only">Memuat fasilitas.</span>
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-4 sm:grid-cols-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

export default function FacilitiesPage() {
  const loaderData = useLoaderData() as ContractSchemas["PublicFacilities"] | null;
  const { data, loading } = useApiQuery(["public", "facilities"], () => siteService.facilities(), {
    initialData: loaderData ?? fallbackFacilities,
    refetchOnMount: false,
  });
  const facilities = data ?? fallbackFacilities;

  if (loading && !data) return <FacilitiesContentSkeleton />;

  const totalMonthly = facilities.production_capacities.reduce((sum, item) => {
    const numeric = Number(
      String(item.value)
        .replace(/\./g, "")
        .replace(/[^0-9]/g, ""),
    );
    return sum + (Number.isFinite(numeric) ? numeric : 0);
  }, 0);

  return (
    <>
      <Seo
        title="Fasilitas"
        description="Kapasitas produksi dan cetak kain custom Indobraga: sublimation, press, DTF, pattern making, sample, QC, finishing, packing."
        path="/fasilitas"
      />
      <PageHero
        kicker="Fasilitas"
        title="Kapasitas produksi dan cetak kain custom"
        subtitle="Didukung mesin sublimation, press, DTF, pattern making, sample, QC, finishing, hingga packing."
      />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {facilities.strengths.map((strength) => (
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

        <section className="mt-12">
          <h2 className="text-2xl font-bold">Kapasitas Produksi</h2>
          <p className="mt-1 text-muted-foreground">
            Total {totalMonthly.toLocaleString("id-ID")} pcs per bulan{" "}
            <span className="ml-1 rounded-full bg-primary-soft px-2 py-0.5 text-xs text-primary">
              Data CP Indobraga
            </span>
          </p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {facilities.production_capacities.map((capacity) => (
              <li key={capacity.id} className="rounded-2xl border bg-card p-5 shadow-card">
                <p className="text-xl font-bold">{capacity.value}</p>
                <p className="text-sm text-muted-foreground">{capacity.unit}</p>
                <p className="mt-1 text-sm font-medium">{capacity.product}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12 rounded-3xl bg-primary-deep p-8 text-white sm:p-10">
          <h2 className="text-2xl font-bold">Printing, Sublimation, DTF</h2>
          <p className="mt-1 text-white/70">
            Atexco Model X Plus — mesin sublimasi berkapasitas besar untuk certified ink dan output
            yang konsisten.
          </p>
          <ul className="mt-6 grid gap-4 md:grid-cols-3">
            {facilities.printing_capacities.map((capacity) => (
              <li key={capacity.id} className="rounded-2xl border border-white/15 p-5">
                <p className="text-xl font-bold text-accent">
                  {capacity.value} <span className="text-sm font-normal">{capacity.unit}</span>
                </p>
                <p className="mt-1 font-semibold">{capacity.label}</p>
                {capacity.description ? (
                  <p className="mt-1 text-sm text-white/70">{capacity.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold">Mesin &amp; Area Produksi</h2>
          <ul className="mt-6 space-y-4">
            {facilities.machines.map((machine) => (
              <li
                key={machine.id}
                className="grid gap-2 rounded-2xl border bg-card p-6 shadow-card sm:grid-cols-[200px_1fr]"
              >
                <p className="font-bold text-primary">{machine.metric}</p>
                <div>
                  <p className="font-semibold">{machine.name}</p>
                  {machine.description ? (
                    <p className="mt-1 text-sm text-muted-foreground">{machine.description}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold">Apparel Manufacturing Services</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {facilities.services.map((service) => (
              <span
                key={service.id}
                className="rounded-full border border-input bg-card px-4 py-1.5 text-sm"
              >
                {service.name}
              </span>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
