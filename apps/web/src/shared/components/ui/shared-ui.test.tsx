// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EmptyState, ErrorState, LoadingState } from "@/shared/components/feedback/states";
import { TablePagination } from "@/shared/components/ui/pagination";
import { BrandLogo } from "@/modules/site";

describe("feedback states", () => {
  it("Empty/Error/Loading variants", async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    const { rerender } = render(<EmptyState title="Kosong" />);
    expect(screen.getByText("Kosong")).toBeInTheDocument();
    rerender(<EmptyState title="Kosong" description="Coba lagi nanti." />);
    expect(screen.getByText("Coba lagi nanti.")).toBeInTheDocument();

    rerender(<ErrorState error={new Error("gagal")} />);
    expect(screen.getByText("gagal")).toBeInTheDocument();
    expect(screen.queryByText("Coba lagi")).toBeNull();
    rerender(<ErrorState error={new Error("gagal")} onRetry={retry} />);
    await user.click(screen.getByText("Coba lagi"));
    expect(retry).toHaveBeenCalled();

    rerender(<LoadingState label="Memuat uji..." />);
    // Label tampil ganda (sr-only + aria-hidden).
    expect(screen.getAllByText("Memuat uji...").length).toBeGreaterThan(0);
  });
});

describe("TablePagination", () => {
  const base = {
    page: 5,
    pageCount: 12,
    pageSize: 10,
    total: 120,
    start: 41,
    end: 50,
    onPageChange: () => undefined,
    onPageSizeChange: () => undefined,
    itemLabel: "data",
  };

  it("ellipsis + halaman aktif + ganti ukuran", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();
    render(
      <TablePagination {...base} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />,
    );
    expect(screen.getByText("Menampilkan 41–50 dari 120 data")).toBeInTheDocument();
    // Ellipsis muncul saat > 7 halaman.
    expect(document.body.textContent).toContain("…");
    expect(screen.getByRole("button", { name: "5" })).toHaveAttribute("aria-current", "page");
    await user.click(screen.getByRole("button", { name: "6" }));
    expect(onPageChange).toHaveBeenCalledWith(6);
    fireEvent.change(screen.getByLabelText("Per halaman"), { target: { value: "25" } });
    expect(onPageSizeChange).toHaveBeenCalledWith(25);
  });

  it("tombol nonaktif di ujung + total nol", () => {
    render(<TablePagination {...base} page={1} pageCount={1} total={0} start={0} end={0} />);
    expect(screen.getByText("Menampilkan 0–0 dari 0 data")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sebelumnya" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Berikutnya" })).toBeDisabled();
  });
});

describe("BrandLogo", () => {
  it("inisial, logo, tanpa teks", () => {
    const { rerender } = render(<BrandLogo brand="Indobraga" />);
    expect(screen.getByText("I")).toBeInTheDocument();
    rerender(<BrandLogo brand="Braga Indonesia" />);
    expect(screen.getByText("BI")).toBeInTheDocument();
    rerender(<BrandLogo brand="Indobraga" logoUrl="https://x.test/logo.png" showText={false} />);
    expect(screen.getByAltText("Indobraga")).toHaveAttribute("src", "https://x.test/logo.png");
    expect(screen.queryByText("Indobraga")).toBeNull();
  });
});
