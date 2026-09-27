import { cn } from "@/shared/lib/cn";

export function BrandLogo({
  brand,
  logoUrl,
  className,
  markClassName,
  textClassName,
  showText = true,
}: {
  brand: string;
  logoUrl?: string | null;
  className?: string;
  markClassName?: string;
  textClassName?: string;
  showText?: boolean;
}) {
  if (!logoUrl) {
    const initials =
      brand
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0] ?? "")
        .join("")
        .toUpperCase() || "IB";
    return (
      <span className={cn("flex items-center gap-2", className)}>
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl bg-primary font-bold text-primary-foreground",
            markClassName,
          )}
          aria-hidden="true"
        >
          {initials}
        </span>
        {showText ? (
          <span className={cn("font-bold text-foreground", textClassName)}>{brand}</span>
        ) : null}
      </span>
    );
  }
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <img src={logoUrl} alt={brand} className={cn("h-9 w-9 object-contain", markClassName)} />
      {showText ? (
        <span className={cn("font-bold text-foreground", textClassName)}>{brand}</span>
      ) : null}
    </span>
  );
}
