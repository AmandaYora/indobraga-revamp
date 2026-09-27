import { describe, expect, it } from "vitest";
import { contentService } from "@/modules/content/services/content.service";
import { loginAs } from "@/test/utils";

describe("contentService", () => {
  it("detail, reorder, arsip, unarsip, hapus", async () => {
    await loginAs();
    const created = await contentService.create<{ id: number }>("services", {
      name: "Layanan Svc",
      status: "draft",
    });
    const detail = await contentService.detail<{ id: number; name: string }>(
      "services",
      created.id,
    );
    expect(detail.name).toBe("Layanan Svc");

    const updated = await contentService.update<{ id: number; name: string }>(
      "services",
      created.id,
      {
        name: "Layanan Svc 2",
      },
    );
    expect(updated.name).toBe("Layanan Svc 2");

    const published = await contentService.updateStatus<{ id: number; status: string }>(
      "services",
      created.id,
      "published",
    );
    expect(published.status).toBe("published");

    const archived = await contentService.archive<{ id: number; status: string }>(
      "services",
      created.id,
    );
    expect(archived.status).toBe("archived");

    const unarchived = await contentService.unarchive<{ id: number; status: string }>(
      "services",
      created.id,
    );
    expect(unarchived.status).toBe("published");

    await contentService.remove("services", created.id);
    const error = await contentService
      .detail("services", created.id)
      .then(() => null)
      .catch((e) => e);
    expect(error?.code).toBe("NOT_FOUND");
  });

  it("list filter status + search + pagination meta", async () => {
    await loginAs();
    const result = await contentService.list<{ id: number }>("services", {
      page: 1,
      limit: 5,
      status: "published",
    });
    expect(result.pagination.page).toBe(1);
    expect(result.items.length).toBeLessThanOrEqual(5);
    const search = await contentService.list("services", { q: "zzzz-tidak-ada" });
    expect(search.items).toHaveLength(0);
    expect(search.pagination.total).toBe(0);
  });

  it("list tanpa params + detail id string", async () => {
    await loginAs();
    const result = await contentService.list<{ id: number }>("services");
    expect(result.pagination.page).toBe(1);
    const first = result.items[0];
    const detail = await contentService.detail<{ id: number }>("services", String(first.id));
    expect(detail.id).toBe(first.id);
  });
});
