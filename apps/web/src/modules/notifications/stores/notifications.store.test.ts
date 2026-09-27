// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { useNotificationsStore } from "@/modules/notifications/stores/notifications.store";
import { loginAs, stubEventSource } from "@/test/utils";

describe("notifications.store", () => {
  it("connect SSE + markRead/markAllRead + disconnect", async () => {
    const es = stubEventSource();
    try {
      await loginAs();
      const store = useNotificationsStore.getState();
      store.connect();
      expect(es.instances).toHaveLength(1);
      await store.loadUnreadCount();
      expect(useNotificationsStore.getState().unreadCount).toBeGreaterThan(0);
      await store.loadList();
      expect(useNotificationsStore.getState().items.length).toBeGreaterThan(0);

      const first = useNotificationsStore.getState().items.find((item) => !item.read);
      expect(first).toBeDefined();
      await store.markRead(first!.id);
      expect(
        useNotificationsStore.getState().items.find((item) => item.id === first!.id)?.read,
      ).toBe(true);

      await store.markAllRead();
      expect(useNotificationsStore.getState().unreadCount).toBe(0);

      store.disconnect();
      expect(useNotificationsStore.getState().connected).toBe(false);
    } finally {
      es.restore();
    }
  });

  it("tanpa EventSource → polling fallback", async () => {
    const original = window.EventSource;
    // @ts-expect-error simulasi browser lama
    window.EventSource = undefined;
    try {
      await loginAs();
      useNotificationsStore.getState().connect();
      expect(useNotificationsStore.getState().connected).toBe(false);
      // Kuras request polling fire-and-forget agar tak bocor ke test berikut.
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(useNotificationsStore.getState().unreadCount).toBeGreaterThan(0);
      useNotificationsStore.getState().disconnect();
    } finally {
      window.EventSource = original;
    }
  });

  it("API gagal → state dipertahankan", async () => {
    await loginAs();
    const { failNextRequest } = await import("@/mocks/server");
    const store = useNotificationsStore.getState();
    failNextRequest({ status: 500, code: "INTERNAL_ERROR", message: "x" });
    await store.loadUnreadCount();
    expect(useNotificationsStore.getState().unreadCount).toBe(0);
    failNextRequest({ status: 500, code: "INTERNAL_ERROR", message: "x" });
    await store.loadList();
    expect(useNotificationsStore.getState().items).toHaveLength(0);
    // markRead/markAllRead gagal → refresh count.
    await store.loadUnreadCount();
    failNextRequest({ status: 500, code: "INTERNAL_ERROR", message: "x" });
    await store.markAllRead();
  });
});
