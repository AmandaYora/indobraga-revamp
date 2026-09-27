import "@testing-library/jest-dom/vitest";
import { afterEach, beforeAll, beforeEach, afterAll } from "vitest";
import { cleanup } from "@testing-library/react";
import { toast } from "sonner";
import { server, resetMockDb } from "@/mocks/server";
import { httpClient, registerUnauthorizedHandler } from "@/shared/services/http-client";
import { MOCK_CSRF_TOKEN } from "@/mocks/db";
import { useAuthStore } from "@/modules/auth/stores/auth.store";
import { useSiteSettingsStore } from "@/modules/site/stores/site-settings.store";
import { useNotificationsStore } from "@/modules/notifications/stores/notifications.store";
import { useUiStore } from "@/shared/stores/ui.store";
import { fallbackSettings } from "@/modules/site/lib/fallbacks";

beforeAll(() => {
  // Node tidak mendukung URL relatif — arahkan ke localhost agar MSW mencegat.
  httpClient.defaults.baseURL = "http://localhost";
  // Interceptor CSRF membaca document.cookie (hanya browser) — di node pakai default.
  httpClient.defaults.headers.common["x-csrf-token"] = MOCK_CSRF_TOKEN;
  server.listen({ onUnhandledRequest: "error" });
});

function resetTestState() {
  resetMockDb();
  server.resetHandlers();
  // State toast global sonner bocor antar test (portal di-mount ulang) — dismiss.
  toast.dismiss();
  // Netralkan efek samping store antar test.
  registerUnauthorizedHandler(null);
  useAuthStore.setState({ user: null, status: "unknown", ensurePromise: null });
  useSiteSettingsStore.setState({ settings: fallbackSettings, loaded: false, loading: false });
  useNotificationsStore.getState().disconnect();
  useNotificationsStore.setState({ items: [], unreadCount: 0, backoffMs: 1000 });
  useUiStore.setState({ sidebarOpen: false, menuQuery: "" });
}

beforeEach(() => {
  resetTestState();
});

afterEach(() => {
  cleanup();
  resetTestState();
});

afterAll(() => {
  server.close();
});
