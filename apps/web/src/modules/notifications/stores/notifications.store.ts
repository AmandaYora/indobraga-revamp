import { create } from "zustand";
import { notificationsService } from "@/modules/notifications";
import type { ContractSchemas } from "@/shared/types/contract";

type Notification = ContractSchemas["Notification"];

const POLL_INTERVAL_MS = 120_000;
const MAX_BACKOFF_MS = 60_000;

interface NotificationsState {
  unreadCount: number;
  items: Notification[];
  connected: boolean;
  eventSource: EventSource | null;
  pollTimer: number | null;
  backoffMs: number;
  loadUnreadCount: () => Promise<void>;
  loadList: () => Promise<void>;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
  connect: () => void;
  disconnect: () => void;
}

function supportsEventSource(): boolean {
  return typeof EventSource !== "undefined";
}

export const useNotificationsStore = create<NotificationsState>()((set, get) => ({
  unreadCount: 0,
  items: [],
  connected: false,
  eventSource: null,
  pollTimer: null,
  backoffMs: 1000,
  loadUnreadCount: async () => {
    try {
      const unreadCount = await notificationsService.unreadCount();
      set({ unreadCount });
    } catch {
      // Badge dibiarkan apa adanya; error tidak mengganggu admin.
    }
  },
  loadList: async () => {
    try {
      const result = await notificationsService.list({ limit: 10, read: "all" });
      set({ items: result.items });
    } catch {
      // Dropdown menampilkan state terakhir.
    }
  },
  markRead: async (id) => {
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? { ...item, read: true } : item)),
      unreadCount: Math.max(
        0,
        state.unreadCount - (state.items.find((item) => item.id === id && !item.read) ? 1 : 0),
      ),
    }));
    try {
      await notificationsService.markRead(id);
    } catch {
      await get().loadUnreadCount();
    }
  },
  markAllRead: async () => {
    set((state) => ({
      items: state.items.map((item) => ({ ...item, read: true })),
      unreadCount: 0,
    }));
    try {
      await notificationsService.markAllRead();
    } catch {
      await get().loadUnreadCount();
    }
  },
  connect: () => {
    const { eventSource, pollTimer } = get();
    if (eventSource || !supportsEventSource()) {
      if (!pollTimer) {
        void get().loadUnreadCount();
        const timer = window.setInterval(() => void get().loadUnreadCount(), POLL_INTERVAL_MS);
        set({ pollTimer: timer });
      }
      return;
    }
    try {
      const source = new EventSource(notificationsService.streamUrl(), { withCredentials: true });
      const refresh = () => {
        void get().loadUnreadCount();
      };
      source.addEventListener("notification.created", refresh);
      source.addEventListener("notification.read", refresh);
      source.onerror = () => {
        // Gagal konek → tutup & fallback polling 120 dtk + reconnect backoff.
        source.close();
        const backoff = Math.min(get().backoffMs * 2, MAX_BACKOFF_MS);
        set({ eventSource: null, connected: false, backoffMs: backoff });
        if (!get().pollTimer) {
          const timer = window.setInterval(() => void get().loadUnreadCount(), POLL_INTERVAL_MS);
          set({ pollTimer: timer });
        }
        window.setTimeout(() => {
          if (!get().eventSource) get().connect();
        }, backoff);
      };
      set({ eventSource: source, connected: true, backoffMs: 1000 });
      if (pollTimer) {
        window.clearInterval(pollTimer);
        set({ pollTimer: null });
      }
    } catch {
      if (!get().pollTimer) {
        const timer = window.setInterval(() => void get().loadUnreadCount(), POLL_INTERVAL_MS);
        set({ pollTimer: timer });
      }
    }
  },
  disconnect: () => {
    const { eventSource, pollTimer } = get();
    eventSource?.close();
    if (pollTimer !== null) window.clearInterval(pollTimer);
    set({ eventSource: null, pollTimer: null, connected: false });
  },
}));
