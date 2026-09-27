import { setupWorker } from "msw/browser";
import { handlers } from "@/mocks/handlers";
import { db, MOCK_CSRF_TOKEN } from "@/mocks/db";
import { getCsrfCookieName } from "@/shared/services/csrf";

function ensureCsrfCookie() {
  if (typeof document === "undefined") return;
  const name = getCsrfCookieName();
  if (!document.cookie.split(";").some((part) => part.trim().startsWith(`${name}=`))) {
    document.cookie = `${name}=${MOCK_CSRF_TOKEN}; path=/; max-age=86400`;
  }
}

export const worker = setupWorker(...handlers);

export async function startMockWorker() {
  db.reset();
  ensureCsrfCookie();
  await worker.start({ onUnhandledRequest: "error" });
}
