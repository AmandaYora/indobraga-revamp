import { describe, expect, it } from "vitest";
import { getCsrfCookieName, getCsrfToken } from "@/shared/services/csrf";

describe("csrf", () => {
  it("membaca cookie default dan custom", () => {
    expect(getCsrfCookieName()).toBe("indobraga_csrf");
    expect(getCsrfToken("a=1; indobraga_csrf=token-abc; b=2")).toBe("token-abc");
    expect(getCsrfToken("a=1")).toBeUndefined();
    expect(getCsrfToken("")).toBeUndefined();
  });

  it("toleran terhadap encoding rusak", () => {
    expect(getCsrfToken("indobraga_csrf=%E0%A4%A")).toBe("%E0%A4%A");
  });
});
