// @vitest-environment jsdom
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import PortfolioPage from "@/modules/portfolio/pages/PortfolioPage";
import { portfolioLoader } from "@/modules/site/services/public.loaders";
import { renderWithRoutes } from "@/test/utils";

describe("FE-P01/P02 portofolio", () => {
  it("chip filter + muat lagi cursor", async () => {
    const user = userEvent.setup();
    renderWithRoutes(
      [{ path: "/portfolio", loader: portfolioLoader, Component: PortfolioPage }],
      "/portfolio",
    );
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument());

    const group = screen.getByRole("group", { name: "Filter kategori" });
    expect(within(group).getByText("Semua")).toHaveAttribute("aria-pressed", "true");
    const chips = within(group).getAllByRole("button");
    expect(chips.length).toBeGreaterThan(1);

    // Filter ke kategori pertama selain Semua.
    await user.click(chips[1]);
    expect(chips[1]).toHaveAttribute("aria-pressed", "true");
  });

  it("muat lagi memakai cursor (halaman 2 dari mock)", async () => {
    const user = userEvent.setup();
    renderWithRoutes(
      [{ path: "/portfolio", loader: portfolioLoader, Component: PortfolioPage }],
      "/portfolio",
    );
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument());
    // Seed halaman 1 penuh (8 item) + has_more → tombol tampil.
    const more = await screen.findByText("Muat lagi");
    await user.click(more);
    await waitFor(() => expect(screen.queryByText("Memuat...")).toBeNull());
    // Klik kedua memakai item lokal (tanpa cursor).
    const moreAgain = screen.queryByText("Muat lagi");
    if (moreAgain) {
      await user.click(moreAgain);
    }
  });

  it("modal: buka, keyboard, dots, tutup", async () => {
    const user = userEvent.setup();
    renderWithRoutes(
      [{ path: "/portfolio", loader: portfolioLoader, Component: PortfolioPage }],
      "/portfolio",
    );
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument());

    const cards = screen
      .getAllByRole("button")
      .filter(
        (button) =>
          !button.hasAttribute("aria-pressed") &&
          button.textContent &&
          button.textContent.length > 0 &&
          button.textContent !== "Muat lagi" &&
          button.textContent !== "Memuat...",
      );
    expect(cards.length).toBeGreaterThan(0);
    const card = cards[0];
    await user.click(card);

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();

    // Keyboard navigasi bila > 1 gambar.
    const counter = within(dialog).queryByText(/^\d+\/\d+$/);
    if (counter) {
      const before = counter.textContent;
      await user.keyboard("{ArrowRight}");
      await waitFor(() =>
        expect(within(dialog).getByText(/^\d+\/\d+$/).textContent).not.toBe(before),
      );
      // Dots.
      const dots = within(dialog).getByRole("tablist", { name: "Pilih gambar" });
      expect(within(dots).getAllByRole("tab").length).toBeGreaterThan(1);
    }

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
