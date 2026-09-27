import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import { useNotificationsStore } from "@/modules/notifications/stores/notifications.store";
import { notificationsService } from "@/modules/notifications/services/notifications.service";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { getUserFacingErrorMessage } from "@/shared/services/api-error";
import type { ContractSchemas } from "@/shared/types/contract";
import { ROUTE_PATHS } from "@/app/routes/route-paths";

/* Port dropdown notifikasi `components/admin/AdminLayout.tsx` legacy — markup & kelas 1:1. */

type AdminNotification = ContractSchemas["Notification"];

const notificationSeverityClass: Record<AdminNotification["severity"], string> = {
  error: "bg-destructive",
  info: "bg-primary",
  // Legacy `bg-emerald-600` → token bernilai sama (ADR-0010).
  success: "bg-success-strong",
  warning: "bg-accent",
};

function resourceRoute(resourceType?: string | null): string | null {
  switch (resourceType) {
    case "inquiry":
      return ROUTE_PATHS.adminInquiries;
    case "whatsapp_lead":
      return ROUTE_PATHS.adminWhatsapp;
    case "email_account":
      return ROUTE_PATHS.adminEmailAccounts;
    case "email_campaign":
      return ROUTE_PATHS.adminEmailHistory;
    case "media":
      return ROUTE_PATHS.adminGallery;
    default:
      return null;
  }
}

function formatNotificationTime(value: string): string {
  const createdAt = new Date(value);
  const timestamp = createdAt.getTime();

  if (Number.isNaN(timestamp)) {
    return "";
  }

  const diffMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));

  if (diffMinutes < 1) {
    return "Baru saja";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} menit lalu`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} jam lalu`;
  }

  return createdAt.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function NotificationBell() {
  const nav = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const unread = useNotificationsStore((state) => state.unreadCount);
  const notifications = useNotificationsStore((state) => state.items);
  const loadUnreadCount = useNotificationsStore((state) => state.loadUnreadCount);
  const markRead = useNotificationsStore((state) => state.markRead);
  const markAllRead = useNotificationsStore((state) => state.markAllRead);
  const connect = useNotificationsStore((state) => state.connect);
  const disconnect = useNotificationsStore((state) => state.disconnect);

  useEffect(() => {
    void loadUnreadCount();
    connect();
    return () => disconnect();
  }, [loadUnreadCount, connect, disconnect]);

  const reloadNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    setNotificationsError(null);

    try {
      const result = await notificationsService.list({ limit: 10, read: "all" });
      useNotificationsStore.setState({ items: result.items });
    } catch (error) {
      setNotificationsError(getUserFacingErrorMessage(error));
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  // Legacy memuat ulang daftar setiap kali dropdown dibuka.
  const handleOpenChange = (open: boolean) => {
    setNotificationsOpen(open);
    if (open) {
      void reloadNotifications();
    }
  };

  const openNotification = async (notification: AdminNotification) => {
    if (!notification.read) {
      await markRead(notification.id);
    }

    setNotificationsOpen(false);

    const target = resourceRoute(notification.resource_type);
    if (target) {
      nav(target);
    }
  };

  return (
    <DropdownMenu open={notificationsOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative rounded-full p-2 hover:bg-secondary"
          aria-label={unread > 0 ? `Notifikasi, ${unread} belum dibaca` : "Notifikasi"}
          title="Notifikasi"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold leading-none text-accent-foreground">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[min(calc(100vw-2rem),24rem)] p-0"
        sideOffset={10}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Notifikasi</p>
            <p className="text-xs text-muted-foreground">
              {unread > 0 ? `${unread} belum dibaca` : "Semua sudah dibaca"}
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-primary hover:bg-secondary disabled:cursor-not-allowed disabled:text-muted-foreground"
            disabled={unread === 0}
            onClick={(event) => {
              event.preventDefault();
              void markAllRead();
            }}
            aria-label="Tandai semua notifikasi sebagai dibaca"
            title="Tandai semua dibaca"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Dibaca
          </button>
        </div>
        <div className="max-h-[24rem] overflow-y-auto p-2">
          {notificationsLoading && notifications.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Memuat notifikasi...
            </p>
          )}
          {notificationsError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {notificationsError}
            </div>
          )}
          {!notificationsLoading && !notificationsError && notifications.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Belum ada notifikasi.
            </p>
          )}
          {notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              className={`flex w-full min-w-0 gap-3 rounded-md px-3 py-2.5 text-left transition hover:bg-secondary ${notification.read ? "" : "bg-secondary/70"}`}
              onClick={() => void openNotification(notification)}
            >
              <span
                className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${notificationSeverityClass[notification.severity]}`}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{notification.title}</span>
                <span className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {notification.message}
                </span>
                <span className="mt-1 block text-[11px] font-medium text-muted-foreground">
                  {formatNotificationTime(notification.created_at)}
                </span>
              </span>
            </button>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
