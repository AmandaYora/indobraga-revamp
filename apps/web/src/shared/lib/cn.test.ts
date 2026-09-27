import { describe, expect, it } from "vitest";
import { cn } from "@/shared/lib/cn";

describe("cn", () => {
  it("menggabung class dan menyelesaikan konflik tailwind-merge", () => {
    expect(cn("px-2 px-4")).toBe("px-4");
    const hidden = false;
    expect(cn("a", hidden && "b", "c")).toBe("a c");
  });
});
