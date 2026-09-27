// @vitest-environment jsdom
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { Outlet } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { Toaster } from "sonner";
import EmailBlastPage from "@/modules/email/pages/EmailBlastPage";
import { loginAs, renderWithRoutes, ADMIN_EMAIL } from "@/test/utils";

vi.mock("read-excel-file/browser", () => ({
  default: async () => {
    throw new Error("file rusak");
  },
}));

vi.mock("write-excel-file/browser", () => ({
  default: async () => undefined,
}));

describe("blast import rusak", () => {
  it("file tak terbaca → state error", async () => {
    await loginAs(ADMIN_EMAIL);
    renderWithRoutes(
      [
        {
          path: "/",
          element: (
            <>
              <Outlet />
              <Toaster />
            </>
          ),
          children: [{ path: "admin/email-blast", element: <EmailBlastPage /> }],
        },
      ],
      "/admin/email-blast?tab=bulk",
    );
    await waitFor(() => expect(screen.getByText("Kirim Email")).toBeInTheDocument());
    const fileInput = document.querySelector(
      'input[aria-label="File penerima XLSX"]',
    ) as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: {
        files: [
          new File(["rusak"], "rusak.xlsx", {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }),
        ],
      },
    });
    expect(await screen.findByText("File tidak bisa dibaca sebagai Excel.")).toBeInTheDocument();
  }, 20000);
});
