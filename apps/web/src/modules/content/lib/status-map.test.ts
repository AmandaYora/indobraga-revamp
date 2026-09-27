import { describe, expect, it } from "vitest";
import { colors } from "@/theme/colors";
import {
  accountStatusTone,
  campaignStatusTone,
  contentStatusTone,
  inquiryStatusTone,
  mediaStatusTone,
} from "@/modules/content/lib/status-map";

describe("theme tokens", () => {
  it("token terpusat merujuk variabel CSS", () => {
    expect(colors.primary).toBe("var(--primary)");
    expect(colors.whatsapp).toBe("var(--whatsapp)");
    expect(colors.sidebar).toBe("var(--sidebar)");
  });
});

describe("status-map", () => {
  it("semua mapper mengembalikan tone valid", () => {
    expect(contentStatusTone("published")).toBe("success");
    expect(contentStatusTone("draft")).toBe("secondary");
    expect(contentStatusTone("archived")).toBe("muted");
    expect(contentStatusTone("aneh")).toBe("outline");
    expect(inquiryStatusTone("new")).toBe("default");
    expect(inquiryStatusTone("contacted")).toBe("warning");
    expect(inquiryStatusTone("in_progress")).toBe("warning");
    expect(inquiryStatusTone("closed")).toBe("success");
    expect(inquiryStatusTone("spam")).toBe("destructive");
    expect(inquiryStatusTone("aneh")).toBe("outline");
    expect(campaignStatusTone("completed")).toBe("success");
    expect(campaignStatusTone("pending")).toBe("warning");
    expect(campaignStatusTone("processing")).toBe("default");
    expect(campaignStatusTone("failed")).toBe("destructive");
    expect(campaignStatusTone("draft")).toBe("secondary");
    expect(campaignStatusTone("cancelled")).toBe("muted");
    expect(campaignStatusTone("aneh")).toBe("outline");
    expect(mediaStatusTone("completed")).toBe("success");
    expect(mediaStatusTone("failed")).toBe("destructive");
    expect(mediaStatusTone("processing")).toBe("warning");
    expect(mediaStatusTone("archived")).toBe("muted");
    expect(mediaStatusTone("aneh")).toBe("outline");
    expect(accountStatusTone("connected")).toBe("success");
    expect(accountStatusTone("needs_reconnect")).toBe("warning");
    expect(accountStatusTone("revoked")).toBe("destructive");
    expect(accountStatusTone("aneh")).toBe("outline");
  });
});
