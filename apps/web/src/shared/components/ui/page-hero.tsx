import { cn } from "@/shared/lib/cn";

export function PageHero({
  kicker,
  title,
  subtitle,
  image,
}: {
  kicker: string;
  title: string;
  subtitle: string;
  image?: string | null;
}) {
  return (
    <section className="relative overflow-hidden bg-gradient-hero py-16 sm:py-20">
      {image ? (
        <>
          <img
            src={image}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary-deep via-primary-deep/80 to-transparent" />
        </>
      ) : null}
      <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">{kicker}</p>
          <h1 className="mt-3 text-balance text-3xl font-bold text-white sm:text-4xl">{title}</h1>
          <p className="mt-4 text-anywhere text-white/80">{subtitle}</p>
        </div>
        {image ? (
          <div className="hidden w-[340px] shrink-0 overflow-hidden rounded-2xl border border-white/15 lg:block">
            <img src={image} alt="" className="h-48 w-full object-cover" loading="lazy" />
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function MediaPlaceholderLabel({ className }: { className?: string }) {
  return (
    <span className={cn("text-xs text-muted-foreground", className)}>Media belum tersedia</span>
  );
}
