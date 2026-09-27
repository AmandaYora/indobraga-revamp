// @vitest-environment jsdom
import { render, type RenderOptions } from "@testing-library/react";
import { createMemoryRouter, RouterProvider, type RouteObject } from "react-router-dom";
import { useAuthStore } from "@/modules/auth/stores/auth.store";
import { MOCK_PASSWORD } from "@/mocks/db";

export const ADMIN_EMAIL = "admin@example.test";
export const EDITOR_EMAIL = "editor@example.test";

export function renderWithRoutes(
  routes: RouteObject[],
  initialPath = "/",
  options?: RenderOptions,
) {
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] });
  const view = render(<RouterProvider router={router} />, options);
  return { ...view, router };
}

export async function loginAs(email: string = ADMIN_EMAIL) {
  const user = await useAuthStore.getState().login(email, MOCK_PASSWORD);
  return user;
}

export function authState() {
  return useAuthStore.getState();
}

export function stubWindowOpen() {
  const opened: string[] = [];
  const original = window.open;
  window.open = ((url?: string | URL) => {
    opened.push(String(url));
    return null;
  }) as typeof window.open;
  return {
    opened,
    restore: () => {
      window.open = original;
    },
  };
}

export function stubEventSource() {
  const instances: MockEventSource[] = [];
  class MockEventSource {
    url: string;
    listeners = new Map<string, ((event: Event) => void)[]>();
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: (() => void) | null = null;
    readyState = 1;
    constructor(url: string) {
      this.url = url;
      instances.push(this);
    }
    addEventListener(type: string, listener: (event: Event) => void) {
      const list = this.listeners.get(type) ?? [];
      list.push(listener);
      this.listeners.set(type, list);
    }
    removeEventListener() {
      // Tidak dipakai mock.
    }
    emit(type: string, data: unknown) {
      const event = new MessageEvent(type, { data: JSON.stringify(data) });
      for (const listener of this.listeners.get(type) ?? []) listener(event);
      if (type === "message" && this.onmessage) this.onmessage(event);
    }
    fail() {
      this.readyState = 2;
      this.onerror?.();
    }
    close() {
      this.readyState = 2;
    }
  }
  const original = window.EventSource;
  window.EventSource = MockEventSource as unknown as typeof EventSource;
  return {
    instances,
    restore: () => {
      window.EventSource = original;
    },
  };
}
