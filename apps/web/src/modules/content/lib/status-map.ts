import type { BadgeProps } from "@/shared/components/ui/badge";

type Tone = NonNullable<BadgeProps["tone"]>;

/**
 * Peta status domain → tone Badge generik. Shared UI tidak mengenal status
 * domain (aturan standar); setiap modul memakai peta ini.
 */

export function contentStatusTone(status: string): Tone {
  switch (status) {
    case "published":
      return "success";
    case "draft":
      return "secondary";
    case "archived":
      return "muted";
    default:
      return "outline";
  }
}

export function inquiryStatusTone(status: string): Tone {
  switch (status) {
    case "new":
      return "default";
    case "contacted":
    case "in_progress":
      return "warning";
    case "closed":
      return "success";
    case "spam":
      return "destructive";
    default:
      return "outline";
  }
}

export function campaignStatusTone(status: string): Tone {
  switch (status) {
    case "completed":
    case "sent":
    case "delivered":
      return "success";
    case "pending":
    case "queued":
      return "warning";
    case "processing":
    case "sending":
      return "default";
    case "failed":
      return "destructive";
    case "draft":
      return "secondary";
    case "cancelled":
    case "skipped":
      return "muted";
    default:
      return "outline";
  }
}

export function mediaStatusTone(status: string): Tone {
  switch (status) {
    case "completed":
    case "active":
      return "success";
    case "failed":
    case "cleanup_failed":
      return "destructive";
    case "processing":
    case "pending":
      return "warning";
    case "archived":
      return "muted";
    default:
      return "outline";
  }
}

export function accountStatusTone(status: string): Tone {
  switch (status) {
    case "connected":
    case "active":
      return "success";
    case "needs_reconnect":
    case "expired":
      return "warning";
    case "revoked":
    case "disabled":
    case "invalid":
      return "destructive";
    default:
      return "outline";
  }
}
