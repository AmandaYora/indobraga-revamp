import { describe, expect, it } from "vitest";
import { useAuthStore } from "@/modules/auth/stores/auth.store";
import { MOCK_PASSWORD } from "@/mocks/db";
import { ADMIN_EMAIL, EDITOR_EMAIL } from "@/test/utils";

describe("auth.store", () => {
  it("ensure dedupe in-flight (BC-26): 1 request untuk 2 panggilan", async () => {
    const { server } = await import("@/mocks/server");
    let hits = 0;
    const onStart = ({ request }: { request: Request }) => {
      if (request.url.includes("/api/v1/auth/me")) hits += 1;
    };
    server.events.on("request:start", onStart);
    try {
      const [a, b] = await Promise.all([
        useAuthStore.getState().ensure(),
        useAuthStore.getState().ensure(),
      ]);
      expect(a).toBeNull();
      expect(b).toBeNull();
      expect(hits).toBe(1);
    } finally {
      server.events.removeListener("request:start", onStart);
    }
  });

  it("login/logout/reset + hasPermission per role", async () => {
    const store = useAuthStore.getState();
    const admin = await store.login(ADMIN_EMAIL, MOCK_PASSWORD);
    expect(admin.role).toBe("super_admin");
    expect(useAuthStore.getState().hasPermission("email_campaign_logs.read")).toBe(true);

    await store.logout();
    expect(useAuthStore.getState().status).toBe("anonymous");

    const editor = await store.login(EDITOR_EMAIL, MOCK_PASSWORD);
    expect(editor.role).toBe("content_editor");
    // content_editor seed tidak punya email_campaign_logs.read.
    expect(useAuthStore.getState().hasPermission("email_campaign_logs.read")).toBe(false);
    expect(useAuthStore.getState().hasPermission("content.manage")).toBe(true);

    useAuthStore.getState().reset();
    expect(useAuthStore.getState().hasPermission("content.manage")).toBe(false);
  });

  it("login gagal → ApiError", async () => {
    const error = await useAuthStore
      .getState()
      .login(ADMIN_EMAIL, "salah-salah-123")
      .then(() => null)
      .catch((e) => e);
    expect(error?.code).toBe("UNAUTHENTICATED");
  });
});
