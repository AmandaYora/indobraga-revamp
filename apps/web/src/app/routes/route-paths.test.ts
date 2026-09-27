import { describe, expect, it } from "vitest";
import { loginPath, newsDetailPath, newsListPath, ROUTE_PATHS } from "@/app/routes/route-paths";

describe("route-paths", () => {
  it("builder berita mempertahankan page", () => {
    expect(newsDetailPath("slug-a", 2)).toBe("/berita/slug-a?page=2");
    expect(newsDetailPath("slug-a", 1)).toBe("/berita/slug-a");
    expect(newsDetailPath("slug-a")).toBe("/berita/slug-a");
    expect(newsListPath(3)).toBe("/berita?page=3");
    expect(newsListPath(1)).toBe("/berita");
  });

  it("login membawa redirect yang di-encode", () => {
    expect(loginPath("/admin/news")).toBe("/login?redirect=%2Fadmin%2Fnews");
    expect(loginPath()).toBe("/login");
    expect(ROUTE_PATHS.adminUsers).toBe("/admin/users");
  });
});
