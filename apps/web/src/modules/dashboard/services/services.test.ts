import { describe, expect, it } from "vitest";
import { leadsService } from "@/modules/leads/services/leads.service";
import { usersService } from "@/modules/users/services/users.service";
import {
  emailAccountsService,
  emailCampaignsService,
  emailTemplatesService,
} from "@/modules/email/services/email.service";
import { dashboardService } from "@/modules/dashboard/services/dashboard.service";
import { settingsService } from "@/modules/site/services/settings.service";
import { notificationsService } from "@/modules/notifications/services/notifications.service";
import { loginAs } from "@/test/utils";

describe("services admin", () => {
  it("leads: list tanpa params + update + arsip whatsapp", async () => {
    await loginAs();
    const all = await leadsService.inquiries();
    expect(all.pagination.page).toBe(1);
    const list = await leadsService.whatsappLeads({ limit: 1 });
    expect(list.items.length).toBeGreaterThan(0);
    const first = list.items[0] as { id: number };
    await leadsService.updateWhatsappLead(first.id, { status: "contacted", internal_note: "ok" });
    await leadsService.archiveWhatsappLead(first.id);
    const after = await leadsService.whatsappLeads({ limit: 100 });
    expect(after.items.some((item) => (item as { id: number }).id === first.id)).toBe(false);
  });

  it("users: list filter + update + status + hapus", async () => {
    await loginAs();
    const filtered = await usersService.list({ role: "content_editor", status: "active" });
    expect(filtered.items.every((item) => item.role === "content_editor")).toBe(true);
    const created = await usersService.create({
      name: "Svc",
      email: "svc@example.com",
      role: "content_editor",
      temporary_password: "sementara123",
    });
    const updated = await usersService.update(created.id, { name: "Svc 2" });
    expect(updated.name).toBe("Svc 2");
    const inactive = await usersService.updateStatus(created.id, "inactive");
    expect(inactive.status).toBe("inactive");
    await usersService.remove(created.id);
  });

  it("email: templates update/hapus + akun update + kampanye detail/update", async () => {
    await loginAs();
    const template = await emailTemplatesService.create({
      name: "T Svc",
      subject: "S",
      content_mode: "text",
      body_text: "Halo",
    });
    const updated = await emailTemplatesService.update(template.id, { subject: "S2" });
    expect(updated.subject).toBe("S2");
    await emailTemplatesService.remove(template.id);

    const accounts = await emailAccountsService.list({ limit: 100, provider: "smtp" });
    const account = accounts.items[0] as { id: number };
    const reconnected = (await emailAccountsService.reconnect(account.id)) as Record<
      string,
      unknown
    >;
    expect(reconnected).toBeDefined();

    const campaigns = await emailCampaignsService.list({ limit: 1 });
    const campaign = campaigns.items[0] as { id: number };
    const detail = await emailCampaignsService.detail(campaign.id);
    expect(detail.id).toBe(campaign.id);
    const recipients = await emailCampaignsService.recipients(campaign.id, { limit: 5 });
    expect(recipients.pagination).toBeDefined();
  });

  it("dashboard, settings, seo, notifikasi", async () => {
    await loginAs();
    const summary = await dashboardService.summary();
    expect(summary.totals.inquiries).toBeGreaterThanOrEqual(0);
    expect(summary.latest_inquiries.length).toBeLessThanOrEqual(5);

    const settings = await settingsService.get();
    expect(settings.id).toBe(1);
    const saved = await settingsService.update({ brand: "Indobraga" });
    expect(saved.brand).toBe("Indobraga");

    const { siteService } = await import("@/modules/site");
    const seoDefault = await siteService.seoDefault();
    expect(seoDefault.title.length).toBeGreaterThan(0);
    const seoRoute = await siteService.seo("fasilitas");
    expect(seoRoute.title.length).toBeGreaterThan(0);
    const seoMissing = await siteService
      .seo("rute-asing-xyz")
      .then(() => null)
      .catch((e: { code?: string }) => e);
    expect(seoMissing?.code).toBe("NOT_FOUND");

    const unread = await notificationsService.unreadCount();
    expect(unread).toBeGreaterThanOrEqual(0);
    expect(notificationsService.streamUrl()).toContain("/api/v1/admin/notifications/stream");
  });
});
