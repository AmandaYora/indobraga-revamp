// @vitest-environment jsdom
import { render, screen, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DelayedLoading } from "@/app/providers/RouterProvider";

describe("DelayedLoading", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("muncul setelah 300 ms", async () => {
    render(<DelayedLoading />);
    expect(screen.queryByText("Memuat…")).toBeNull();
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(await screen.findByText("Memuat…")).toBeInTheDocument();
  });
});
