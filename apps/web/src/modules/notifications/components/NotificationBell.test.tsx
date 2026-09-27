// @vitest-environment jsdom
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { NotificationBell } from "@/modules/notifications/components/NotificationBell";
import { loginAs, renderWithRoutes, stubEventSource } from "@/test/utils";
import { useNotificationsStore } from "@/modules/notifications/stores/notifications.store";

describe("FE-A03 bell notifikasi", () => {
  it("badge unread + dropdown + tandai dibaca", async () => {
    const user = userEvent.setup();
    const es = stubEventSource();
    await loginAs();
    renderWithRoutes([{ path: "/", element: <NotificationBell /> }]);
    // Badge unread dari seed (6 belum dibaca).
    const bell = await screen.findByLabelText(/Notifikasi, 6 belum dibaca/);
    expect(es.instances).toHaveLength(1);
    expect(es.instances[0].url).toContain("/api/v1/admin/notifications/stream");

    await user.click(bell);
    expect(await screen.findByText("6 belum dibaca")).toBeInTheDocument();
    expect((await screen.findAllByText("Pesan kontak baru")).length).toBeGreaterThan(0);

    // SSE notification.created → refresh count.
    await act(async () => {
      es.instances[0].emit("notification.created", { id: 99 });
    });
    await waitFor(() => expect(screen.getByLabelText(/Notifikasi/)).toBeInTheDocument());

    await user.click(screen.getByText("Tandai semua dibaca"));
    await waitFor(() => expect(screen.queryByText(/belum dibaca/)).toBeNull());
    expect(useNotificationsStore.getState().unreadCount).toBe(0);
    es.restore();
  });

  it("klik notifikasi → tandai dibaca + navigasi sesuai resource", async () => {
    const user = userEvent.setup();
    const es = stubEventSource();
    try {
      await loginAs();
      const { router } = renderWithRoutes([
        { path: "/", element: <NotificationBell /> },
        { path: "/admin/inquiries", element: <div>Daftar inquiry</div> },
      ]);
      const bell = await screen.findByLabelText(/Notifikasi/);
      await user.click(bell);
      const titles = await screen.findAllByText("Pesan kontak baru");
      await user.click(titles[0]);
      await waitFor(() => expect(router.state.location.pathname).toBe("/admin/inquiries"));
      expect(await screen.findByText("Daftar inquiry")).toBeInTheDocument();
    } finally {
      es.restore();
    }
  });

  it("klik notifikasi di halaman sama → tanpa navigasi ulang", async () => {
    const user = userEvent.setup();
    const es = stubEventSource();
    try {
      await loginAs();
      const { router } = renderWithRoutes(
        [{ path: "/admin/inquiries", element: <NotificationBell /> }],
        "/admin/inquiries",
      );
      const bell = await screen.findByLabelText(/Notifikasi/);
      await user.click(bell);
      const titles = await screen.findAllByText("Pesan kontak baru");
      await user.click(titles[0]);
      await waitFor(() => expect(router.state.location.pathname).toBe("/admin/inquiries"));
    } finally {
      es.restore();
    }
  });

  it("SSE gagal → fallback polling + reconnect backoff", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const es = stubEventSource();
    await loginAs();
    renderWithRoutes([{ path: "/", element: <NotificationBell /> }]);
    await screen.findByLabelText(/Notifikasi/);
    expect(es.instances).toHaveLength(1);
    await act(async () => {
      es.instances[0].fail();
    });
    // Reconnect dijadwalkan (backoff) — instance baru muncul setelah timer.
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(useNotificationsStore.getState().connected).toBe(true);
    es.restore();
    vi.useRealTimers();
  });
});
