import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { useNotificationsStore } from "@/modules/notifications";
import { formatDateId } from "@/shared/lib/date";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { ROUTE_PATHS } from "@/app/routes/route-paths";

function resourceRoute(resourceType?: string | null): string {
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
      return ROUTE_PATHS.admin;
  }
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return formatDateId(iso, "short");
}

export function NotificationBell() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const unreadCount = useNotificationsStore((state) => state.unreadCount);
  const items = useNotificationsStore((state) => state.items);
  const loadUnreadCount = useNotificationsStore((state) => state.loadUnreadCount);
  const loadList = useNotificationsStore((state) => state.loadList);
  const markRead = useNotificationsStore((state) => state.markRead);
  const markAllRead = useNotificationsStore((state) => state.markAllRead);
  const connect = useNotificationsStore((state) => state.connect);
  const disconnect = useNotificationsStore((state) => state.disconnect);

  useEffect(() => {
    void loadUnreadCount();
    connect();
    return () => disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (open) void loadList();
  }, [open, loadList]);

  async function handleOpenNotification(item: {
    id: number;
    read: boolean;
    resource_type?: string | null;
  }) {
    if (!item.read) await markRead(item.id);
    setOpen(false);
    const target = resourceRoute(item.resource_type);
    if (target !== location.pathname) {
      navigate(target);
    }
  }

  const unread = items.filter((item) => !item.read).length;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Notifikasi${unreadCount > 0 ? `, ${unreadCount} belum dibaca` : ""}`}
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifikasi</span>
          {unread > 0 ? (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="text-xs font-normal text-primary hover:underline"
            >
              Tandai semua dibaca
            </button>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            Belum ada notifikasi.
          </p>
        ) : (
          <>
            <p className="px-2 pb-1 text-xs text-muted-foreground">
              {unread > 0 ? `${unread} belum dibaca` : "Semua sudah dibaca"}
            </p>
            {items.slice(0, 10).map((item) => (
              <DropdownMenuItem
                key={item.id}
                onSelect={(event) => {
                  event.preventDefault();
                  void handleOpenNotification(item);
                }}
                className="flex-col items-start gap-1"
              >
                <span className="flex w-full items-center gap-2">
                  {!item.read ? (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                  ) : null}
                  <span className="font-medium">{item.title}</span>
                </span>
                <span className="line-clamp-2 text-xs text-muted-foreground">{item.message}</span>
                <span className="text-[11px] text-muted-foreground">
                  {relativeTime(item.created_at)}
                </span>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
