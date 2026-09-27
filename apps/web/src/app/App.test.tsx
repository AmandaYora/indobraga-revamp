// @vitest-environment jsdom
import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("main.tsx bootstrap", () => {
  it("me-render aplikasi penuh ke #root", async () => {
    document.body.innerHTML = '<div id="root"></div>';
    await import("@/main");
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument(), {
      timeout: 10000,
    });
  });
});
