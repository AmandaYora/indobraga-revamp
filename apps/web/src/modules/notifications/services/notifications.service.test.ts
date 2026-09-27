import { describe, expect, it, vi } from "vitest";
import { notificationsService } from "@/modules/notifications/services/notifications.service";

describe("notifications.service", () => {
  it("streamUrl memakai base URL yang dikonfigurasi", () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test");
    expect(notificationsService.streamUrl()).toBe(
      "https://api.example.test/api/v1/admin/notifications/stream",
    );
    vi.unstubAllEnvs();
    expect(notificationsService.streamUrl()).toBe("/api/v1/admin/notifications/stream");
  });
});
