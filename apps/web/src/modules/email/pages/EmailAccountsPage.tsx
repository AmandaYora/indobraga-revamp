import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useApiQuery } from "@/shared/hooks/useApiQuery";
import { emailAccountsService } from "@/modules/email/services/email.service";
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
import { accountStatusTone } from "@/modules/content";
import type { ContractSchemas } from "@/shared/types/contract";

type EmailAccount = ContractSchemas["EmailAccount"];
type SmtpSecurity = ContractSchemas["SmtpSecurity"];

const STATUS_LABEL: Record<string, string> = {
  connected: "Terhubung",
  needs_reconnect: "Perlu Hubungkan Ulang",
  expired: "Kedaluwarsa",
  revoked: "Akses Dicabut",
  disabled: "Nonaktif",
  active: "Aktif",
  invalid: "Tidak Valid",
};

const PROVIDER_LABEL: Record<string, string> = {
  google: "Google",
  smtp: "SMTP",
};

/**
 * FE-E01: search, filter provider, pagination; Google OAuth (tab baru +
 * query connected/status/reason); SMTP create/edit/reconnect/disable/hapus.
 */
export default function EmailAccountsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState("all");
  const [googleOpen, setGoogleOpen] = useState(false);
  const [smtpOpen, setSmtpOpen] = useState(false);
  const [editing, setEditing] = useState<EmailAccount | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<null | {
    title: string;
    description?: string;
    action: () => Promise<void>;
  }>(null);

  const [emailHint, setEmailHint] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [smtp, setSmtp] = useState({
    email_address: "",
    display_name: "",
    smtp_host: "smtp.hostinger.com",
    smtp_port: "465",
    smtp_username: "",
    smtp_password: "",
    smtp_security: "ssl_tls" as SmtpSecurity,
  });

  // Menangani query `connected/status/reason` saat kembali dari Google OAuth.
  useEffect(() => {
    const connected = searchParams.get("connected");
    if (connected === null) return;
    const status = searchParams.get("status") ?? "";
    const reason = searchParams.get("reason") ?? "";
    if (connected === "true") {
      toast.success("Akun Google terhubung");
    } else {
      toast.error("Akun Google gagal terhubung", {
        description: reason || status || undefined,
      });
    }
    searchParams.delete("connected");
    searchParams.delete("status");
    searchParams.delete("reason");
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const { data, error, loading, reload } = useApiQuery(
    ["admin", "email-accounts", page, pageSize, query, provider],
    () =>
      emailAccountsService.list({
        page,
        limit: pageSize,
        ...(query.trim() ? { q: query.trim() } : {}),
        ...(provider === "all" ? {} : { provider }),
      }),
  );

  const items = data?.items ?? [];
  const pagination = data?.pagination ?? { page: 1, limit: pageSize, total: 0, total_pages: 1 };

  async function runAction(action: () => Promise<void>, successMessage: string) {
    try {
      await action();
      toast.success(successMessage);
      reload();
    } catch (actionError) {
      toast.error("Aksi gagal", {
        description: actionError instanceof ApiError ? actionError.message : undefined,
      });
    }
  }

  async function handleReconnect(item: EmailAccount) {
    // Paritas legacy: Google → buka authorization_url tab baru; SMTP → re-validasi.
    if (item.provider === "google") {
      try {
        const result = await emailAccountsService.googleOAuthUrl({
          email_hint: item.email_address,
          display_name: item.display_name ?? undefined,
        });
        window.open(result.authorization_url, "_blank", "noopener,noreferrer");
      } catch (requestError) {
        toast.error("Gagal membuat tautan OAuth", {
          description:
            requestError instanceof ApiError ? getUserFacingErrorMessage(requestError) : undefined,
        });
      }
      return;
    }
    await runAction(
      () => emailAccountsService.reconnect(item.id).then(() => undefined),
      "Menghubungkan ulang...",
    );
  }

  async function handleGoogleConnect() {
    setSaving(true);
    try {
      const result = await emailAccountsService.googleOAuthUrl({
        ...(emailHint.trim() ? { email_hint: emailHint.trim() } : {}),
        ...(displayName.trim() ? { display_name: displayName.trim() } : {}),
      });
      window.open(result.authorization_url, "_blank", "noopener,noreferrer");
      setGoogleOpen(false);
    } catch (requestError) {
      toast.error("Gagal membuat tautan OAuth", {
        description:
          requestError instanceof ApiError ? getUserFacingErrorMessage(requestError) : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  function openSmtpCreate() {
    setEditing(null);
    setSmtp({
      email_address: "",
      display_name: "",
      smtp_host: "smtp.hostinger.com",
      smtp_port: "465",
      smtp_username: "",
      smtp_password: "",
      smtp_security: "ssl_tls",
    });
    setSmtpOpen(true);
  }

  function openSmtpEdit(item: EmailAccount) {
    setEditing(item);
    setDisplayName(item.display_name ?? "");
    if (item.provider !== "google") {
      setSmtp({
        email_address: item.email_address,
        display_name: item.display_name ?? "",
        smtp_host: item.smtp_host ?? "smtp.hostinger.com",
        smtp_port: String(item.smtp_port ?? 465),
        smtp_username: item.smtp_username ?? "",
        smtp_password: "",
        smtp_security: (item.smtp_security ?? "ssl_tls") as SmtpSecurity,
      });
    }
    setSmtpOpen(true);
  }

  async function handleSmtpSubmit() {
    if (editing?.provider === "google") {
      if (displayName.trim() === "") {
        toast.error("Nama tampilan wajib diisi.");
        return;
      }
      setSaving(true);
      try {
        await emailAccountsService.update(editing.id, { display_name: displayName.trim() });
        toast.success("Akun diperbarui");
        setSmtpOpen(false);
        reload();
      } catch (requestError) {
        toast.error("Simpan gagal", {
          description: requestError instanceof ApiError ? requestError.message : undefined,
        });
      } finally {
        setSaving(false);
      }
      return;
    }
    if (smtp.email_address.trim() === "" || smtp.smtp_host.trim() === "") {
      toast.error("Email dan host SMTP wajib diisi.");
      return;
    }
    const port = Number(smtp.smtp_port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      toast.error("Port SMTP tidak valid.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await emailAccountsService.update(editing.id, {
          display_name: smtp.display_name.trim() || smtp.email_address.trim(),
          smtp_host: smtp.smtp_host.trim(),
          smtp_port: port,
          smtp_username: smtp.smtp_username.trim(),
          ...(smtp.smtp_password !== "" ? { smtp_password: smtp.smtp_password } : {}),
          smtp_security: smtp.smtp_security,
        });
        toast.success("Akun diperbarui");
      } else {
        if (smtp.smtp_password === "") {
          toast.error("Kata sandi SMTP wajib diisi.");
          setSaving(false);
          return;
        }
        if (smtp.smtp_username.trim() === "") {
          setSmtp((current) => ({ ...current, smtp_username: smtp.email_address.trim() }));
        }
        await emailAccountsService.createSmtp({
          email_address: smtp.email_address.trim(),
          display_name: smtp.display_name.trim() || smtp.email_address.trim(),
          smtp_host: smtp.smtp_host.trim(),
          smtp_port: port,
          smtp_security: smtp.smtp_security,
          smtp_username: smtp.smtp_username.trim() || smtp.email_address.trim(),
          smtp_password: smtp.smtp_password,
        });
        toast.success("Akun SMTP ditambahkan");
      }
      setSmtpOpen(false);
      reload();
    } catch (requestError) {
      toast.error("Simpan gagal", {
        description: requestError instanceof ApiError ? requestError.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Seo
        title="Akun Pengirim Email"
        description="Kelola akun Google dan SMTP pengirim email."
        path="/admin/email-accounts"
        noindex
      />
      <PageTitle
        title="Akun Pengirim Email"
        desc="Hubungkan Google atau tambahkan akun SMTP untuk mengirim email."
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setEmailHint("");
                setDisplayName("");
                setGoogleOpen(true);
              }}
            >
              Hubungkan Google
            </Button>
            <Button onClick={openSmtpCreate}>Tambah SMTP</Button>
          </div>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="search"
          aria-label="Cari akun email"
          placeholder="Cari email atau nama..."
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          className="w-full max-w-sm rounded-full border border-input bg-background px-4 py-2 text-sm"
        />
        <select
          aria-label="Filter provider"
          value={provider}
          onChange={(event) => {
            setProvider(event.target.value);
            setPage(1);
          }}
          className="rounded-full border border-input bg-background px-4 py-2 text-sm"
        >
          <option value="all">Semua provider</option>
          <option value="google">Google</option>
          <option value="smtp">SMTP</option>
        </select>
      </div>

      {loading && !data ? (
        <LoadingState label="Memuat akun email..." />
      ) : error && !data ? (
        <ErrorState error={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Belum ada akun email"
          description="Hubungkan Google atau tambahkan akun SMTP."
        />
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            {items.map((item) => (
              <Card key={item.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {item.display_name ?? item.email_address}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">{item.email_address}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {PROVIDER_LABEL[item.provider] ?? item.provider}
                    </p>
                  </div>
                  <Badge tone={accountStatusTone(item.status)}>
                    {STATUS_LABEL[item.status] ?? item.status}
                  </Badge>
                </div>
                {item.last_error ? (
                  <p className="mt-2 text-xs text-destructive">{item.last_error}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-1">
                  <Button size="sm" variant="outline" onClick={() => openSmtpEdit(item)}>
                    Ubah
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void handleReconnect(item)}>
                    Hubungkan ulang
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      void runAction(
                        () => emailAccountsService.disable(item.id).then(() => undefined),
                        "Akun dinonaktifkan",
                      )
                    }
                  >
                    Nonaktifkan
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() =>
                      setConfirm({
                        title: "Hapus akun ini?",
                        description: `${item.email_address} tidak bisa lagi dipakai mengirim email.`,
                        action: () => emailAccountsService.remove(item.id),
                      })
                    }
                  >
                    Hapus
                  </Button>
                </div>
              </Card>
            ))}
          </div>
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
            pageSizeOptions={[6, 12, 24]}
            itemLabel="akun"
          />
        </>
      )}

      <CrudModal
        open={googleOpen}
        onOpenChange={setGoogleOpen}
        title="Hubungkan Google"
        description="Tautan otorisasi dibuka di tab baru. Setelah selesai, kembali ke halaman ini."
        submitLabel="Buka tautan Google"
        submitting={saving}
        onSubmit={() => void handleGoogleConnect()}
      >
        <Field label="Email Google" hint="Opsional — petunjuk akun yang akan dihubungkan.">
          <TextInput
            type="email"
            value={emailHint}
            onChange={(event) => setEmailHint(event.target.value)}
            placeholder="nama@gmail.com"
          />
        </Field>
        <Field label="Nama tampilan">
          <TextInput
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Indobraga"
          />
        </Field>
      </CrudModal>

      <CrudModal
        open={smtpOpen}
        onOpenChange={setSmtpOpen}
        title={editing ? "Ubah akun email" : "Tambah akun SMTP"}
        submitting={saving}
        onSubmit={() => void handleSmtpSubmit()}
      >
        {editing?.provider === "google" ? (
          <Field label="Nama tampilan" required>
            <TextInput
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </Field>
        ) : (
          <>
            <Field label="Alamat email" required>
              <TextInput
                type="email"
                value={smtp.email_address}
                disabled={!!editing}
                onChange={(event) =>
                  setSmtp((current) => ({ ...current, email_address: event.target.value }))
                }
              />
            </Field>
            <Field label="Nama tampilan" required>
              <TextInput
                value={smtp.display_name}
                onChange={(event) =>
                  setSmtp((current) => ({ ...current, display_name: event.target.value }))
                }
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Host SMTP" required>
                <TextInput
                  value={smtp.smtp_host}
                  onChange={(event) =>
                    setSmtp((current) => ({ ...current, smtp_host: event.target.value }))
                  }
                />
              </Field>
              <Field label="Port" required>
                <TextInput
                  type="number"
                  value={smtp.smtp_port}
                  onChange={(event) =>
                    setSmtp((current) => ({ ...current, smtp_port: event.target.value }))
                  }
                />
              </Field>
            </div>
            <Field label="Username SMTP" required>
              <TextInput
                value={smtp.smtp_username}
                placeholder="Otomatis memakai alamat email bila kosong."
                onChange={(event) =>
                  setSmtp((current) => ({ ...current, smtp_username: event.target.value }))
                }
              />
            </Field>
            <Field
              label={editing ? "Kata sandi baru" : "Kata sandi SMTP"}
              required={!editing}
              hint={editing ? "Opsional — kosongkan bila tidak diubah." : undefined}
            >
              <TextInput
                type="password"
                value={smtp.smtp_password}
                autoComplete="new-password"
                onChange={(event) =>
                  setSmtp((current) => ({ ...current, smtp_password: event.target.value }))
                }
              />
            </Field>
            <Field label="Keamanan" required>
              <Select
                value={smtp.smtp_security}
                onChange={(event) =>
                  setSmtp((current) => ({
                    ...current,
                    smtp_security: event.target.value as SmtpSecurity,
                  }))
                }
              >
                <option value="ssl_tls">SSL/TLS</option>
                <option value="starttls">STARTTLS</option>
                <option value="none">Tanpa enkripsi</option>
              </Select>
            </Field>
          </>
        )}
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
