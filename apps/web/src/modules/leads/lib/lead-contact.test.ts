// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import {
  buildWhatsAppGreeting,
  buildWhatsAppUrl,
  normalizePhoneId,
  openWhatsAppLead,
} from "@/modules/leads/lib/lead-contact";

describe("lead-contact", () => {
  it("normalisasi nomor Indonesia", () => {
    expect(normalizePhoneId("0851-5870-0895")).toBe("6285158700895");
    expect(normalizePhoneId("+62 851 5870 0895")).toBe("6285158700895");
    expect(normalizePhoneId("6285158700895")).toBe("6285158700895");
    expect(normalizePhoneId("85158700895")).toBe("6285158700895");
    expect(normalizePhoneId("123")).toBeNull();
    expect(normalizePhoneId("")).toBeNull();
    expect(normalizePhoneId(null)).toBeNull();
  });

  it("membangun URL wa.me dengan pesan ter-encode", () => {
    expect(buildWhatsAppUrl("085158700895")).toBe("https://wa.me/6285158700895");
    expect(buildWhatsAppUrl("085158700895", "Halo kak")).toBe(
      "https://wa.me/6285158700895?text=Halo%20kak",
    );
    expect(buildWhatsAppUrl("tidak-valid")).toBeNull();
  });

  it("salam memakai nama atau sapaan default", () => {
    expect(buildWhatsAppGreeting("Budi")).toContain("Halo Budi");
    expect(buildWhatsAppGreeting()).toContain("Halo Kak");
  });

  it("openWhatsAppLead membuka tab baru bila nomor valid", () => {
    const opened: string[] = [];
    vi.stubGlobal("open", undefined);
    Object.defineProperty(window, "open", {
      value: (url: string) => {
        opened.push(url);
        return null;
      },
      writable: true,
      configurable: true,
    });
    expect(openWhatsAppLead({ phone: "085158700895", name: "Budi" })).toBe(true);
    expect(opened[0]).toContain("https://wa.me/6285158700895");
    expect(openWhatsAppLead({ phone: "x" })).toBe(false);
    vi.unstubAllGlobals();
  });
});
