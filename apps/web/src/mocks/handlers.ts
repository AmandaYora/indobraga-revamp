import { publicHandlers } from "@/mocks/handlers/public";
import { authHandlers } from "@/mocks/handlers/auth";
import { contentHandlers } from "@/mocks/handlers/content";
import { mediaHandlers } from "@/mocks/handlers/media";
import { leadsHandlers } from "@/mocks/handlers/leads";
import { notificationsHandlers } from "@/mocks/handlers/notifications";
import { emailHandlers } from "@/mocks/handlers/email";
import { usersHandlers } from "@/mocks/handlers/users";
import { miscHandlers } from "@/mocks/handlers/misc";

/**
 * Seluruh handler MSW — satu per modul, stateful (DB in-memory).
 * `onUnhandledRequest: "error"` dipasang di `browser.ts`/`server.ts` agar
 * request yang menyimpang dari kontrak langsung merah.
 */
export const handlers = [
  ...publicHandlers,
  ...authHandlers,
  ...contentHandlers,
  ...mediaHandlers,
  ...leadsHandlers,
  ...notificationsHandlers,
  ...emailHandlers,
  ...usersHandlers,
  ...miscHandlers,
];
