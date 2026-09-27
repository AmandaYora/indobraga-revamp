// @vitest-environment jsdom
import { render, screen, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createMemoryRouter, Link, Outlet, RouterProvider, useRevalidator } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { RouteError } from "@/shared/components/feedback/RouteError";
import { DelayedFallback } from "@/shared/components/feedback/DelayedFallback";
import { ErrorBoundary } from "@/app/providers/ErrorBoundary";

describe("RouteError", () => {
  it("tombol coba lagi memicu revalidasi", async () => {
    function Boom() {
      const revalidator = useRevalidator();
      return (
        <button type="button" onClick={() => revalidator.revalidate()}>
          Coba lagi
        </button>
      );
    }
    const router = createMemoryRouter([
      { path: "/", element: <Boom />, errorElement: <RouteError /> },
    ]);
    render(<RouterProvider router={router} />);
    expect(await screen.findByText("Coba lagi")).toBeInTheDocument();
  });

  it("menampilkan pesan aman", async () => {
    function Thrower(): React.ReactNode {
      throw new Error("Data gagal dimuat");
    }
    const router = createMemoryRouter([
      { path: "/", element: <Thrower />, errorElement: <RouteError /> },
    ]);
    render(<RouterProvider router={router} />);
    expect(await screen.findByText("Data gagal dimuat")).toBeInTheDocument();
    expect(await screen.findByText("Coba lagi")).toBeInTheDocument();
  });
});

describe("ErrorBoundary", () => {
  it("fallback + reset", async () => {
    const user = (await import("@testing-library/user-event")).default.setup();
    function Rusak(): React.ReactNode {
      throw new Error("rusak");
    }
    // Bungkam console.error React untuk test ini.
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      render(
        <ErrorBoundary>
          <Rusak />
        </ErrorBoundary>,
      );
      expect(await screen.findByText("Terjadi kendala")).toBeInTheDocument();
      await user.click(screen.getByText("Coba lagi"));
    } finally {
      spy.mockRestore();
    }
  });
});

describe("DelayedFallback", () => {
  it("tidak tampil bila navigasi cepat", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const router = createMemoryRouter([
        {
          path: "/",
          element: (
            <>
              <DelayedFallback>
                <div>Skeleton</div>
              </DelayedFallback>
              <div>Konten</div>
            </>
          ),
        },
      ]);
      render(<RouterProvider router={router} />);
      expect(screen.getByText("Konten")).toBeInTheDocument();
      expect(screen.queryByText("Skeleton")).toBeNull();
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.queryByText("Skeleton")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("tampil bila loader lambat > 300 ms", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      let resolveLoader!: () => void;
      const gate = new Promise<void>((resolve) => {
        resolveLoader = resolve;
      });
      const router = createMemoryRouter(
        [
          {
            path: "/",
            element: (
              <>
                <DelayedFallback>
                  <div>Skeleton lambat</div>
                </DelayedFallback>
                <Link to="/lambat">Ke lambat</Link>
                <Outlet />
              </>
            ),
            children: [
              { index: true, element: <div>Beranda</div> },
              { path: "lambat", loader: () => gate, element: <div>Lambat selesai</div> },
            ],
          },
        ],
        { initialEntries: ["/"] },
      );
      render(<RouterProvider router={router} />);
      expect(await screen.findByText("Beranda")).toBeInTheDocument();
      await act(async () => {
        await userEvent.click(screen.getByText("Ke lambat"));
      });
      await act(async () => {
        vi.advanceTimersByTime(400);
      });
      expect(await screen.findByText("Skeleton lambat")).toBeInTheDocument();
      await act(async () => {
        resolveLoader();
      });
      expect(await screen.findByText("Lambat selesai")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
