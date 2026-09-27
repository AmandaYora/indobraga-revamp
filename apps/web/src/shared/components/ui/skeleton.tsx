import { cn } from "@/shared/lib/cn";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skeleton-shimmer rounded-md bg-primary/10", className)} {...props} />;
}

export { Skeleton };
