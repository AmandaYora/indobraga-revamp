import { describe, expect, it } from "vitest";
import { requireAuth } from "@/app/routes/guards";
import { loginAs } from "@/test/utils";

function args(url: string) {
  return { request: new Request(url), params: {}, context: undefined };
}

describe("guards langsung", () => {
  it("requireAuth di /login tidak menambah redirect", async () => {
    await loginAs();
    // Sudah login → lolos (null).
    const result = await requireAuth(args("http://localhost/admin") as never);
    expect(result).toBeNull();
  });

  it("requireAuth anonim melempar redirect login", async () => {
    const thrown = await requireAuth(args("http://localhost/admin/news") as never).catch((e) => e);
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(302);
    expect((thrown as Response).headers.get("Location")).toContain("/login?redirect=");
  });

  it("requireAuth di /login tidak menambah redirect", async () => {
    const thrown = await requireAuth(args("http://localhost/login") as never).catch((e) => e);
    expect((thrown as Response).headers.get("Location")).toBe("/login");
  });
});
