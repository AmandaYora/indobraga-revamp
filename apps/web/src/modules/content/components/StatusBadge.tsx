import { Badge } from "@/shared/components/ui/badge";
import type { StatusDisplay } from "@/modules/content/lib/status-map";

/**
 * Badge status domain = `StatusBadge` legacy: label + tone dari peta status per domain
 * (`lib/status-map.ts`), dirender dengan `Badge` generik.
 */
export function StatusBadge({ display }: { display: StatusDisplay }) {
  return <Badge tone={display.tone}>{display.label}</Badge>;
}
