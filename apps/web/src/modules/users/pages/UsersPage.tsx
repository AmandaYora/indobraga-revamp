import { useState } from "react";
import { Ban, Edit2, Plus, Search, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { useApiQuery } from "@/shared/hooks/useApiQuery";
import { usersService } from "@/modules/users/services/users.service";
import { useAuthStore } from "@/modules/auth";
import { PageTitle } from "@/shared/components/ui/page-title";
import { Card } from "@/shared/components/ui/card";
import { PrimaryButton } from "@/shared/components/ui/action-buttons";
import { ActionButtonGroup, IconActionButton } from "@/shared/components/ui/icon-action-button";
import { TablePagination } from "@/shared/components/ui/pagination";
import { EmptyState, ErrorState, LoadingState } from "@/shared/components/feedback/states";
import {
  ConfirmDialog,
  CrudModal,
  Field,
  Select,
  StatusBadge,
  TextInput,
  userStatus,
} from "@/modules/content";
import { Seo } from "@/modules/site";
import { getUserFacingErrorMessage } from "@/shared/services/api-error";
import { formatDateId } from "@/shared/lib/date";
import type { ContractSchemas } from "@/shared/types/contract";

type SafeUser = ContractSchemas["SafeUser"];
type AdminRole = ContractSchemas["AdminRole"];

/** Port `routes/admin.users.tsx` legacy — markup, teks, dan kelas 1:1. */
export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<SafeUser | null>(null);
  const [target, setTarget] = useState<SafeUser | null>(null);
  const [form, setForm] = useState<{
    name: string;
    email: string;
    role: AdminRole;
    temporary_password: string;
    new_password: string;
  }>({
    name: "",
    email: "",
    role: "content_editor",
    temporary_password: "",
    new_password: "",
  });
  // BC-26: data `me` dari store sesi (legacy memanggil `authApi.me()` lagi di halaman ini).
  const currentRole = useAuthStore((state) => state.user?.role);
  const canManageSuperAdmin = currentRole === "super_admin";
  // Legacy: content_editor tidak boleh memfilter `super_admin` (effect reset ke "all").
  const roleFilter = currentRole === "content_editor" && role === "super_admin" ? "all" : role;
  const users = useApiQuery(["admin", "users", page, pageSize, query, roleFilter], () =>
    usersService.list({
      page,
      limit: pageSize,
      search: query || undefined,
      role: roleFilter === "all" ? undefined : roleFilter,
    }),
  );
  const list = users.data?.items ?? [];
  const pagination = users.data?.pagination;
  const start =
    pagination && pagination.total > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const end = pagination ? Math.min(pagination.page * pagination.limit, pagination.total) : 0;

  // Legacy mereset halaman ke 1 saat pageSize/query/role berubah (via effect).
  const changeQuery = (value: string) => {
    setQuery(value);
    setPage(1);
  };
  const changeRole = (value: string) => {
    setRole(value);
    setPage(1);
  };
  const changePageSize = (value: number) => {
    setPageSize(value);
    setPage(1);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: "",
      email: "",
      role: "content_editor",
      temporary_password: "",
      new_password: "",
    });
    setOpenForm(true);
  };

  const openEdit = (user: SafeUser) => {
    setEditing(user);
    setForm({
      name: user.name,
      email: user.email,
      role: user.role,
      temporary_password: "",
      new_password: "",
    });
    setOpenForm(true);
  };

  const submit = async () => {
    try {
      const submittedRole: AdminRole = canManageSuperAdmin ? form.role : "content_editor";
      if (editing) {
        const newPassword = form.new_password.trim();
        if (newPassword && newPassword.length < 8) {
          toast.error("Kata sandi baru minimal 8 karakter.");
          return;
        }

        const payload: ContractSchemas["UpdateUserInput"] = {
          name: form.name,
          role: submittedRole,
        };
        if (newPassword) {
          payload.new_password = newPassword;
        }

        await usersService.update(editing.id, payload);
      } else {
        const temporaryPassword = form.temporary_password.trim();
        if (temporaryPassword.length < 8) {
          toast.error("Kata sandi sementara minimal 8 karakter.");
          return;
        }

        await usersService.create({
          name: form.name,
          email: form.email,
          role: submittedRole,
          temporary_password: temporaryPassword,
        });
      }
      toast.success(editing ? "Pengguna diperbarui" : "Pengguna ditambahkan");
      setOpenForm(false);
      users.reload();
    } catch (error) {
      toast.error("Pengguna gagal disimpan", {
        description: getUserFacingErrorMessage(error, { action: "save" }),
      });
    }
  };

  const toggleStatus = async (user: SafeUser) => {
    try {
      await usersService.updateStatus(user.id, user.status === "active" ? "inactive" : "active");
      toast.success("Akses pengguna diperbarui");
      users.reload();
    } catch (error) {
      toast.error("Akses pengguna gagal diperbarui", {
        description: getUserFacingErrorMessage(error, { action: "save" }),
      });
    }
  };

  const remove = async () => {
    if (!target) {
      return;
    }
    try {
      await usersService.remove(target.id);
      toast.success("Pengguna dinonaktifkan");
      setTarget(null);
      users.reload();
    } catch (error) {
      toast.error("Pengguna gagal dinonaktifkan", {
        description: getUserFacingErrorMessage(error, { action: "delete" }),
      });
    }
  };

  return (
    <>
      <Seo
        title="Pengguna Admin"
        description="Kelola pengguna panel admin."
        path="/admin/users"
        noindex
      />
      <PageTitle
        title="Pengguna"
        desc="Kelola akun dan hak akses untuk dashboard admin."
        action={
          <PrimaryButton onClick={openCreate}>
            <Plus className="h-4 w-4" /> Tambah Pengguna
          </PrimaryButton>
        }
      />
      <Card className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 basis-full sm:basis-auto">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => changeQuery(event.target.value)}
            placeholder="Cari nama atau email..."
            className="w-full rounded-full border border-border bg-secondary py-2 pl-10 pr-4 text-sm outline-none focus:border-primary"
          />
        </div>
        <Select
          value={roleFilter}
          onChange={(event) => changeRole(event.target.value)}
          className="w-full sm:w-56"
        >
          <option value="all">{canManageSuperAdmin ? "Semua akses" : "Semua editor"}</option>
          {canManageSuperAdmin && <option value="super_admin">Admin Utama</option>}
          <option value="content_editor">Editor Konten</option>
        </Select>
      </Card>

      {users.loading && !users.data && <LoadingState label="Memuat pengguna..." />}
      {users.error && <ErrorState error={users.error} onRetry={users.reload} />}

      <div className="grid gap-4 lg:hidden">
        {list.length === 0 && !users.loading && (
          <Card>
            <EmptyState
              title="Tidak ada pengguna"
              description="Coba filter atau kata kunci lain."
            />
          </Card>
        )}
        {list.map((user) => (
          <Card key={user.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-anywhere font-semibold">{user.name}</p>
                <p className="text-anywhere text-xs text-muted-foreground">{user.email}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {user.role === "super_admin" ? "Admin Utama" : "Editor Konten"}
                </p>
              </div>
              <StatusBadge display={userStatus(user.status)} />
            </div>
            <UserActions
              user={user}
              onEdit={() => openEdit(user)}
              onToggle={() => void toggleStatus(user)}
              onDelete={() => setTarget(user)}
            />
          </Card>
        ))}
      </div>

      <Card className="hidden overflow-hidden p-0 lg:block">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-4 text-left">Pengguna</th>
              <th className="p-4 text-left">Akses</th>
              <th className="p-4 text-left">Login Terakhir</th>
              <th className="p-4 text-left">Status Akses</th>
              <th className="p-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.map((user) => (
              <tr key={user.id} className="hover:bg-secondary/40">
                <td className="p-4">
                  <p className="font-semibold">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </td>
                <td className="p-4">
                  {user.role === "super_admin" ? "Admin Utama" : "Editor Konten"}
                </td>
                <td className="p-4 text-muted-foreground">
                  {user.last_login_at ? formatDateId(user.last_login_at, "short") : "-"}
                </td>
                <td className="p-4">
                  <StatusBadge display={userStatus(user.status)} />
                </td>
                <td className="p-4 text-right">
                  <UserActions
                    user={user}
                    onEdit={() => openEdit(user)}
                    onToggle={() => void toggleStatus(user)}
                    onDelete={() => setTarget(user)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && !users.loading && (
          <EmptyState title="Tidak ada pengguna" description="Coba filter atau kata kunci lain." />
        )}
      </Card>

      {pagination && (
        <div className="mt-3">
          <TablePagination
            page={pagination.page}
            pageCount={pagination.total_pages}
            pageSize={pagination.limit}
            total={pagination.total}
            start={start}
            end={end}
            onPageChange={setPage}
            onPageSizeChange={changePageSize}
            itemLabel="pengguna"
            className="rounded-xl border bg-card"
          />
        </div>
      )}

      <CrudModal
        open={openForm}
        onOpenChange={setOpenForm}
        title={editing ? "Ubah Pengguna" : "Tambah Pengguna"}
        description={
          editing
            ? "Atur nama, hak akses, dan kata sandi pengguna dashboard."
            : "Atur nama, email, hak akses, dan kata sandi sementara."
        }
        onSubmit={() => void submit()}
        size="md"
      >
        <Field label="Nama" required>
          <TextInput
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        {!editing && (
          <Field label="Email" required>
            <TextInput
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
        )}
        <Field label="Hak Akses">
          {canManageSuperAdmin ? (
            <Select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as AdminRole })}
            >
              <option value="super_admin">Admin Utama</option>
              <option value="content_editor">Editor Konten</option>
            </Select>
          ) : (
            <div className="rounded-xl border border-border bg-secondary px-3 py-2 text-sm font-semibold text-muted-foreground">
              Editor Konten
            </div>
          )}
        </Field>
        {!editing && (
          <Field label="Kata Sandi Sementara" required>
            <TextInput
              type="password"
              value={form.temporary_password}
              onChange={(e) => setForm({ ...form, temporary_password: e.target.value })}
              autoComplete="new-password"
            />
          </Field>
        )}
        {editing && (
          <Field
            label="Kata Sandi Baru"
            hint="Kosongkan jika kata sandi tidak diganti. Jika diisi, minimal 8 karakter."
          >
            <TextInput
              type="password"
              value={form.new_password}
              onChange={(e) => setForm({ ...form, new_password: e.target.value })}
              autoComplete="new-password"
            />
          </Field>
        )}
      </CrudModal>

      <ConfirmDialog
        open={Boolean(target)}
        onOpenChange={(open) => !open && setTarget(null)}
        title={target ? `Nonaktifkan ${target.name}?` : "Nonaktifkan pengguna?"}
        description="Pengguna ini tidak dapat masuk lagi sampai diaktifkan kembali."
        confirmLabel="Nonaktifkan"
        onConfirm={remove}
      />
    </>
  );
}

function UserActions({
  user,
  onEdit,
  onToggle,
  onDelete,
}: {
  user: SafeUser;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const accessAction = user.status === "active" ? "Nonaktifkan Akses" : "Aktifkan Akses";

  return (
    <ActionButtonGroup className="mt-3 justify-start lg:mt-0 lg:justify-end">
      <IconActionButton
        label={`Ubah pengguna ${user.name}`}
        tooltip="Ubah"
        onClick={onEdit}
        icon={<Edit2 className="h-4 w-4" />}
      />
      <IconActionButton
        label={`${accessAction} ${user.name}`}
        tooltip={accessAction}
        onClick={onToggle}
        icon={
          user.status === "active" ? (
            <UserX className="h-4 w-4" />
          ) : (
            <UserCheck className="h-4 w-4" />
          )
        }
        tone={user.status === "active" ? "warning" : "success"}
      />
      <IconActionButton
        label={`Nonaktifkan pengguna ${user.name}`}
        tooltip="Nonaktifkan"
        onClick={onDelete}
        icon={<Ban className="h-4 w-4" />}
        tone="danger"
      />
    </ActionButtonGroup>
  );
}
