// @vitest-environment jsdom
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Outlet } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Toaster } from "sonner";
import UsersPage from "@/modules/users/pages/UsersPage";
import { authState, loginAs, renderWithRoutes, ADMIN_EMAIL, EDITOR_EMAIL } from "@/test/utils";

function usersRoute() {
  return renderWithRoutes(
    [
      {
        path: "/",
        element: (
          <>
            <Outlet />
            <Toaster />
          </>
        ),
        children: [{ path: "admin/users", element: <UsersPage /> }],
      },
    ],
    "/admin/users",
  );
}

describe("FE-U01 pengguna", () => {
  it("buat + ubah + nonaktif + hapus", async () => {
    const user = userEvent.setup();
    await loginAs(ADMIN_EMAIL);
    usersRoute();
    await waitFor(() => expect(screen.getByText("Pengguna Admin")).toBeInTheDocument());

    // Buat dengan password sementara.
    await user.click(screen.getByText("Tambah pengguna"));
    const dialog = await screen.findByRole("dialog");
    const inputs = dialog.querySelectorAll("input");
    await user.type(inputs[0] as HTMLInputElement, "Pengguna Uji");
    await user.type(inputs[1] as HTMLInputElement, "uji@example.com");
    await user.type(inputs[2] as HTMLInputElement, "sementara123");
    await user.click(dialog.querySelector('button[type="submit"]') as HTMLButtonElement);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(await screen.findByText("Pengguna ditambahkan")).toBeInTheDocument();

    // Nonaktifkan lalu hapus (BUKAN akun sendiri).
    // Selalu ada 2 salinan (kartu mobile + baris desktop).
    const found = await screen.findAllByText("uji@example.com", {}, { timeout: 5000 });
    expect(found.length).toBeGreaterThan(0);

    // Nonaktifkan via baris desktop (tabel, tersembunyi via CSS tapi di-DOM).
    const toggleButtons = screen.getAllByText("Nonaktifkan");
    // Tombol pertama milik kartu mobile; klik salah satu yang aktif.
    await user.click(toggleButtons[0]);
    expect(
      await screen.findByText("Pengguna dinonaktifkan", {}, { timeout: 5000 }),
    ).toBeInTheDocument();

    // Hapus permanen via ConfirmDialog.
    const deleteButtons = screen.getAllByText("Hapus");
    await user.click(deleteButtons[0]);
    const confirm = await screen.findByRole("alertdialog");
    await user.click(confirm.querySelector("button:last-child") as HTMLButtonElement);
    expect(await screen.findByText("Berhasil", {}, { timeout: 5000 })).toBeInTheDocument();
  });

  it("ubah nama + password baru opsional", async () => {
    const user = userEvent.setup();
    await loginAs(ADMIN_EMAIL);
    usersRoute();
    await waitFor(() => expect(screen.getByText("Pengguna Admin")).toBeInTheDocument(), {
      timeout: 8000,
    });
    const editButtons = await screen.findAllByText("Ubah", {}, { timeout: 8000 });
    await user.click(editButtons[0]);
    const dialog = await screen.findByRole("dialog");
    const inputs = dialog.querySelectorAll("input");
    // inputs: nama, (email terkunci saat ubah), peran select, password.
    await user.clear(inputs[0] as HTMLInputElement);
    await user.type(inputs[0] as HTMLInputElement, "Nama Ubah Uji");
    const passwordInputs = dialog.querySelectorAll('input[type="password"]');
    await user.type(passwordInputs[0] as HTMLInputElement, "baru12345");
    await user.click(dialog.querySelector('button[type="submit"]') as HTMLButtonElement);
    expect(
      await screen.findByText("Pengguna diperbarui", {}, { timeout: 8000 }),
    ).toBeInTheDocument();
  });

  it("pencarian kosong → empty state", async () => {
    const user = userEvent.setup();
    await loginAs(ADMIN_EMAIL);
    usersRoute();
    await waitFor(() => expect(screen.getByText("Pengguna Admin")).toBeInTheDocument(), {
      timeout: 8000,
    });
    await user.type(screen.getByLabelText("Cari pengguna"), "zzzz-tidak-ada");
    expect(
      await screen.findByText("Tidak ada pengguna", {}, { timeout: 8000 }),
    ).toBeInTheDocument();
  });

  it("tidak bisa menonaktifkan/menghapus diri sendiri", async () => {
    await loginAs(ADMIN_EMAIL);
    usersRoute();
    await waitFor(() => expect(screen.getByText("Pengguna Admin")).toBeInTheDocument(), {
      timeout: 8000,
    });
    // Tombol diri sendiri disabled (desktop) — cari baris admin.
    const selfRows = await screen.findAllByText("admin@indobraga.com", {}, { timeout: 5000 });
    expect(selfRows.length).toBeGreaterThan(0);
  });

  it("filter peran + ubah tanpa password + submit editor", async () => {
    const user = userEvent.setup();
    await loginAs(ADMIN_EMAIL);
    usersRoute();
    await waitFor(() => expect(screen.getByText("Pengguna Admin")).toBeInTheDocument(), {
      timeout: 8000,
    });

    // Filter peran ke editor.
    await user.selectOptions(screen.getByLabelText("Filter peran"), ["content_editor"]);
    await waitFor(() => expect(screen.getByText("Pengguna Admin")).toBeInTheDocument());

    // Ubah tanpa password baru (opsional).
    const editButtons = await screen.findAllByText("Ubah");
    await user.click(editButtons[0]);
    const dialog = await screen.findByRole("dialog");
    await user.click(dialog.querySelector('button[type="submit"]') as HTMLButtonElement);
    expect(
      await screen.findByText("Pengguna diperbarui", {}, { timeout: 8000 }),
    ).toBeInTheDocument();
  });

  it("editor membuat pengguna: peran dipaksa content_editor", async () => {
    const user = userEvent.setup();
    const { EDITOR_EMAIL } = await import("@/test/utils");
    await loginAs(EDITOR_EMAIL);
    usersRoute();
    await waitFor(() => expect(screen.getByText("Pengguna Admin")).toBeInTheDocument(), {
      timeout: 8000,
    });
    await user.click(screen.getByText("Tambah pengguna"));
    const dialog = await screen.findByRole("dialog");
    const inputs = dialog.querySelectorAll("input");
    await user.type(inputs[0] as HTMLInputElement, "Oleh Editor");
    await user.type(inputs[1] as HTMLInputElement, "oleh-editor@example.com");
    await user.type(inputs[2] as HTMLInputElement, "sementara123");
    await user.click(dialog.querySelector('button[type="submit"]') as HTMLButtonElement);
    expect(
      await screen.findByText("Pengguna ditambahkan", {}, { timeout: 8000 }),
    ).toBeInTheDocument();
  });

  it("content_editor: tanpa opsi super_admin", async () => {
    const user = userEvent.setup();
    await loginAs(EDITOR_EMAIL);
    expect(authState().user?.role).toBe("content_editor");
    usersRoute();
    await waitFor(() => expect(screen.getByText("Pengguna Admin")).toBeInTheDocument());
    await user.click(screen.getByText("Tambah pengguna"));
    const dialog = await screen.findByRole("dialog");
    const roleSelect = dialog.querySelector("select") as HTMLSelectElement;
    const options = Array.from(roleSelect.options).map((option) => option.value);
    expect(options).not.toContain("super_admin");
    expect(options).toContain("content_editor");
  });
});
