import { useState } from "react";
import { toast } from "sonner";
import { useApiQuery } from "@/shared/hooks/useApiQuery";
import { usersService } from "@/modules/users/services/users.service";
import { useAuthStore } from "@/modules/auth";
import { PageTitle } from "@/shared/components/ui/page-title";
import { Card } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { TablePagination } from "@/shared/components/ui/pagination";
import {
  CrudModal,
  ConfirmDialog,
  Field,
  TextInput,
  Select,
} from "@/modules/content/components/CrudModal";
import { EmptyState, ErrorState, LoadingState } from "@/shared/components/feedback/states";
import { Seo } from "@/modules/site";
import { ApiError, getUserFacingErrorMessage } from "@/shared/services/api-error";
import { formatDateId } from "@/shared/lib/date";
import type { ContractSchemas } from "@/shared/types/contract";

type SafeUser = ContractSchemas["SafeUser"];
type AdminRole = ContractSchemas["AdminRole"];

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Admin Utama",
  content_editor: "Editor Konten",
};

/**
 * FE-U01: search, filter role, pagination, create (password sementara),
 * edit (password baru opsional), aktif/nonaktif, hapus; aturan content_editor.
 */
export default function UsersPage() {
  const currentUser = useAuthStore((state) => state.user);
  const isSuperAdmin = currentUser?.role === "super_admin";
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState(isSuperAdmin ? "all" : "content_editor");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SafeUser | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AdminRole>("content_editor");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<null | {
    title: string;
    description?: string;
    action: () => Promise<void>;
  }>(null);

  // content_editor tidak melihat & tidak bisa memberi `super_admin`.
  const availableRoles: AdminRole[] = isSuperAdmin
    ? ["super_admin", "content_editor"]
    : ["content_editor"];

  const { data, error, loading, reload } = useApiQuery(
    ["admin", "users", page, pageSize, search, roleFilter],
    () =>
      usersService.list({
        page,
        limit: pageSize,
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(roleFilter === "all" ? {} : { role: roleFilter }),
      }),
  );

  const items = data?.items ?? [];
  const pagination = data?.pagination ?? { page: 1, limit: pageSize, total: 0, total_pages: 1 };

  function openCreate() {
    setEditing(null);
    setName("");
    setEmail("");
    setRole("content_editor");
    setPassword("");
    setFormOpen(true);
  }

  function openEdit(item: SafeUser) {
    setEditing(item);
    setName(item.name);
    setEmail(item.email);
    setRole(isSuperAdmin ? item.role : "content_editor");
    setPassword("");
    setFormOpen(true);
  }

  async function handleSubmit() {
    if (
      name.trim() === "" ||
      (!editing && email.trim() === "") ||
      (!editing && password.length < 8)
    ) {
      toast.error("Periksa isian", {
        description: editing
          ? "Nama wajib diisi."
          : "Nama, email, dan kata sandi sementara (min. 8 karakter) wajib diisi.",
      });
      return;
    }
    if (editing && password !== "" && password.length < 8) {
      toast.error("Periksa isian", { description: "Kata sandi baru minimal 8 karakter." });
      return;
    }
    setSaving(true);
    try {
      const safeRole: AdminRole = isSuperAdmin ? role : "content_editor";
      if (editing) {
        await usersService.update(editing.id, {
          name: name.trim(),
          role: safeRole,
          ...(password !== "" ? { new_password: password } : {}),
        });
        toast.success("Pengguna diperbarui");
      } else {
        await usersService.create({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role: safeRole,
          temporary_password: password,
        });
        toast.success("Pengguna ditambahkan");
      }
      setFormOpen(false);
      reload();
    } catch (saveError) {
      toast.error("Simpan gagal", {
        description: saveError instanceof ApiError ? saveError.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  async function runAction(action: () => Promise<void>, successMessage: string) {
    try {
      await action();
      toast.success(successMessage);
      reload();
    } catch (actionError) {
      toast.error("Aksi gagal", {
        description:
          actionError instanceof ApiError ? getUserFacingErrorMessage(actionError) : undefined,
      });
    }
  }

  return (
    <>
      <Seo
        title="Pengguna Admin"
        description="Kelola pengguna panel admin."
        path="/admin/users"
        noindex
      />
      <PageTitle
        title="Pengguna Admin"
        desc="Kelola akun yang bisa masuk ke panel admin."
        action={<Button onClick={openCreate}>Tambah pengguna</Button>}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="search"
          aria-label="Cari pengguna"
          placeholder="Cari nama atau email..."
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          className="w-full max-w-sm rounded-full border border-input bg-background px-4 py-2 text-sm"
        />
        <select
          aria-label="Filter peran"
          value={roleFilter}
          onChange={(event) => {
            setRoleFilter(event.target.value);
            setPage(1);
          }}
          className="rounded-full border border-input bg-background px-4 py-2 text-sm"
          disabled={!isSuperAdmin}
        >
          {isSuperAdmin ? <option value="all">Semua peran</option> : null}
          <option value="super_admin" hidden={!isSuperAdmin}>
            Admin Utama
          </option>
          <option value="content_editor">Editor Konten</option>
        </select>
      </div>

      {loading && !data ? (
        <LoadingState label="Memuat pengguna..." />
      ) : error && !data ? (
        <ErrorState error={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <EmptyState title="Tidak ada pengguna" description="Coba filter atau kata kunci lain." />
      ) : (
        <>
          <div className="grid gap-3 lg:hidden">
            {items.map((item) => (
              <UserCard
                key={item.id}
                item={item}
                isSelf={item.id === currentUser?.id}
                onEdit={() => openEdit(item)}
                onToggle={() =>
                  runAction(
                    () =>
                      usersService
                        .updateStatus(item.id, item.status === "active" ? "inactive" : "active")
                        .then(() => undefined),
                    item.status === "active" ? "Pengguna dinonaktifkan" : "Pengguna diaktifkan",
                  )
                }
                onRemove={() =>
                  setConfirm({
                    title: "Hapus pengguna ini?",
                    description: `${item.name} tidak bisa lagi masuk ke panel admin.`,
                    action: () => usersService.remove(item.id),
                  })
                }
              />
            ))}
          </div>
          <Card className="hidden lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Nama</th>
                  <th className="px-4 py-2 font-medium">Akses</th>
                  <th className="px-4 py-2 font-medium">Login Terakhir</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="px-4 py-2">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.email}</p>
                    </td>
                    <td className="px-4 py-2">{ROLE_LABEL[item.role] ?? item.role}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {item.last_login_at ? formatDateId(item.last_login_at, "short") : "—"}
                    </td>
                    <td className="px-4 py-2">
                      <Badge tone={item.status === "active" ? "success" : "muted"}>
                        {item.status === "active" ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => openEdit(item)}>
                          Ubah
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={item.id === currentUser?.id}
                          title={
                            item.id === currentUser?.id
                              ? "Tidak bisa menonaktifkan akun sendiri"
                              : undefined
                          }
                          onClick={() =>
                            runAction(
                              () =>
                                usersService
                                  .updateStatus(
                                    item.id,
                                    item.status === "active" ? "inactive" : "active",
                                  )
                                  .then(() => undefined),
                              item.status === "active"
                                ? "Pengguna dinonaktifkan"
                                : "Pengguna diaktifkan",
                            )
                          }
                        >
                          {item.status === "active" ? "Nonaktifkan" : "Aktifkan"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          disabled={item.id === currentUser?.id}
                          title={
                            item.id === currentUser?.id
                              ? "Tidak bisa menghapus akun sendiri"
                              : undefined
                          }
                          onClick={() =>
                            setConfirm({
                              title: "Hapus pengguna ini?",
                              description: `${item.name} tidak bisa lagi masuk ke panel admin.`,
                              action: () => usersService.remove(item.id),
                            })
                          }
                        >
                          Hapus
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <TablePagination
            page={pagination.page}
            pageCount={Math.max(1, pagination.total_pages)}
            pageSize={pagination.limit}
            total={pagination.total}
            start={pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1}
            end={Math.min(pagination.page * pagination.limit, pagination.total)}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
            itemLabel="pengguna"
          />
        </>
      )}

      <CrudModal
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? "Ubah pengguna" : "Tambah pengguna"}
        onSubmit={() => void handleSubmit()}
        submitting={saving}
      >
        <Field label="Nama" required>
          <TextInput
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nama lengkap"
          />
        </Field>
        {!editing ? (
          <Field label="Email" required hint="Email tidak bisa diubah setelah akun dibuat.">
            <TextInput
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nama@indobraga.com"
            />
          </Field>
        ) : null}
        <Field label="Peran" required>
          <Select
            value={role}
            onChange={(event) => setRole(event.target.value as AdminRole)}
            disabled={!isSuperAdmin}
          >
            {availableRoles.map((available) => (
              <option key={available} value={available}>
                {ROLE_LABEL[available]}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label={editing ? "Kata sandi baru" : "Kata sandi sementara"}
          required={!editing}
          hint={
            editing
              ? "Opsional — kosongkan bila tidak diubah (min. 8 karakter)."
              : "Min. 8 karakter — sampaikan ke pengguna."
          }
        >
          <TextInput
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
          />
        </Field>
      </CrudModal>

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
        title={confirm?.title ?? ""}
        description={confirm?.description}
        onConfirm={async () => {
          if (confirm) await runAction(confirm.action, "Berhasil");
          setConfirm(null);
        }}
      />
    </>
  );
}

function UserCard({
  item,
  isSelf,
  onEdit,
  onToggle,
  onRemove,
}: {
  item: SafeUser;
  isSelf: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onRemove: () => void;
}) {
  return (
    <Card>
      <p className="font-medium">{item.name}</p>
      <p className="text-xs text-muted-foreground">{item.email}</p>
      <div className="mt-2 flex items-center gap-2">
        <Badge tone="secondary">{ROLE_LABEL[item.role] ?? item.role}</Badge>
        <Badge tone={item.status === "active" ? "success" : "muted"}>
          {item.status === "active" ? "Aktif" : "Nonaktif"}
        </Badge>
      </div>
      <div className="mt-3 flex gap-1">
        <Button size="sm" variant="outline" onClick={onEdit}>
          Ubah
        </Button>
        <Button size="sm" variant="ghost" disabled={isSelf} onClick={onToggle}>
          {item.status === "active" ? "Nonaktifkan" : "Aktifkan"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive"
          disabled={isSelf}
          onClick={onRemove}
        >
          Hapus
        </Button>
      </div>
    </Card>
  );
}
