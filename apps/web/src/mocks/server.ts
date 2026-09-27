import { setupServer } from "msw/node";
import { handlers } from "@/mocks/handlers";
import { db, MOCK_CSRF_TOKEN } from "@/mocks/db";

/**
 * Server MSW untuk test (node). DB di-reset tiap test via `resetMockDb()`.
 * Cookie CSRF double-submit disimulasikan lewat `document.cookie` (jsdom).
 */
export const server = setupServer(...handlers);

export function resetMockDb() {
  db.reset();
  if (typeof document !== "undefined") {
    document.cookie = `indobraga_csrf=${MOCK_CSRF_TOKEN}; path=/`;
  }
}

export function failNextRequest(failure: { status: number; code: string; message: string }) {
  db.failNextRequest(failure);
}
