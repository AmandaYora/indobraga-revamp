import { describe, expect, it } from "vitest";
import { formatDateId } from "@/shared/lib/date";

describe("formatDateId", () => {
  it("numeric tanpa zero-pad (paritas legacy)", () => {
    expect(formatDateId("2026-04-22")).toBe("22/4/2026");
    expect(formatDateId("2026-04-22T08:00:00.000Z")).toBe("22/4/2026");
  });

  it("short memakai singkatan bulan Indonesia", () => {
    expect(formatDateId("2026-04-22", "short")).toBe("22 Apr 2026");
    expect(formatDateId("2026-08-05", "short")).toBe("5 Agu 2026");
  });

  it("long memakai nama bulan penuh", () => {
    expect(formatDateId("2026-04-22", "long")).toBe("22 April 2026");
    expect(formatDateId("2026-02-18", "long")).toBe("18 Februari 2026");
  });
});
