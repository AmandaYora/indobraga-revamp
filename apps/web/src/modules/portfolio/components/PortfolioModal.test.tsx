// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PortfolioModal } from "@/modules/portfolio/components/PortfolioModal";

const MULTI = {
  id: 1,
  title: "Katalog",
  category: "Jersey",
  short_description: "Deskripsi",
  images: [
    { url: "https://x.test/1.webp", alt: "Satu" },
    { url: "https://x.test/2.webp", alt: "Dua" },
    { url: "https://x.test/3.webp", alt: "Tiga" },
  ],
};

const SINGLE = { id: 2, title: "Tunggal", images: [{ url: "https://x.test/s.webp", alt: "S" }] };

describe("PortfolioModal", () => {
  it("swipe 40px berpindah gambar", async () => {
    render(<PortfolioModal item={MULTI} open onOpenChange={() => undefined} />);
    const stage = document.querySelector(".aspect-\\[4\\/3\\]") as HTMLElement;
    expect(stage).not.toBeNull();
    expect(screen.getByText("1/3")).toBeInTheDocument();
    fireEvent.touchStart(stage, { touches: [{ clientX: 200 }] });
    fireEvent.touchEnd(stage, { changedTouches: [{ clientX: 100 }] });
    expect(await screen.findByText("2/3")).toBeInTheDocument();
    // Swipe pendek (< 40px) diabaikan.
    fireEvent.touchStart(stage, { touches: [{ clientX: 100 }] });
    fireEvent.touchEnd(stage, { changedTouches: [{ clientX: 90 }] });
    expect(screen.getByText("2/3")).toBeInTheDocument();
  });

  it("satu gambar: tanpa panah/dots/counter", () => {
    render(<PortfolioModal item={SINGLE} open onOpenChange={() => undefined} />);
    expect(screen.queryByLabelText("Gambar sebelumnya")).toBeNull();
    expect(screen.queryByLabelText("Gambar berikutnya")).toBeNull();
    expect(screen.queryByRole("tablist")).toBeNull();
  });

  it("panah tidak tampil bila item null", () => {
    render(<PortfolioModal item={null} open onOpenChange={() => undefined} />);
    expect(screen.queryByRole("tablist")).toBeNull();
  });

  it("touchEnd tanpa start + keyboard single diabaikan", () => {
    render(<PortfolioModal item={MULTI} open onOpenChange={() => undefined} />);
    const stage = document.querySelector(".aspect-\\[4\\/3\\]") as HTMLElement;
    fireEvent.touchEnd(stage, { changedTouches: [{ clientX: 10 }] });
    expect(screen.getByText("1/3")).toBeInTheDocument();

    render(<PortfolioModal item={SINGLE} open onOpenChange={() => undefined} />);
    fireEvent.keyDown(document.querySelector(".aspect-\\[4\\/3\\]") as HTMLElement, {
      key: "ArrowRight",
    });
  });

  it("cover dipakai bila images kosong", () => {
    render(
      <PortfolioModal
        item={{ id: 9, title: "Sampul", images: [], cover: "https://x.test/cover.webp" }}
        open
        onOpenChange={() => undefined}
      />,
    );
    expect(screen.getByAltText("Sampul")).toHaveAttribute("src", "https://x.test/cover.webp");
  });
});
