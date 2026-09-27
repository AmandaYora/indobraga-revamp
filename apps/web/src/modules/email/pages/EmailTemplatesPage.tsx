import { useState } from "react";
import { toast } from "sonner";
import { useApiQuery } from "@/shared/hooks/useApiQuery";
import { emailTemplatesService } from "@/modules/email/services/email.service";
import { EmailContentEditor } from "@/modules/email/components/EmailContentEditor";
import { PageTitle } from "@/shared/components/ui/page-title";
import { Card } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { TablePagination } from "@/shared/components/ui/pagination";
import { CrudModal, ConfirmDialog, Field, TextInput } from "@/modules/content/components/CrudModal";
import { EmptyState, ErrorState, LoadingState } from "@/shared/components/feedback/states";
import { Seo } from "@/modules/site";
import { ApiError, getUserFacingErrorMessage } from "@/shared/services/api-error";
import type { ContractSchemas } from "@/shared/types/contract";

type EmailTemplate = ContractSchemas["EmailTemplate"];
type ContentMode = "text" | "html";

/** FE-E06: list/search/paginate, edit, hapus template. */
export default function EmailTemplatesPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [mode, setMode] = useState<ContentMode>("text");
  const [bodyText, setBodyText] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<EmailTemplate | null>(null);

  const { data, error, loading, reload } = useApiQuery(
    ["admin", "email-templates", page, pageSize, query],
    () =>
      emailTemplatesService.list({
        page,
        limit: pageSize,
        ...(query.trim() ? { q: query.trim() } : {}),
      }),
  );

  const items = data?.items ?? [];
  const pagination = data?.pagination ?? { page: 1, limit: pageSize, total: 0, total_pages: 1 };

  function openEdit(item: EmailTemplate) {
    setEditing(item);
    setName(item.name);
    setSubject(item.subject);
    setMode(item.content_mode === "html" ? "html" : "text");
    setBodyText(item.body_text ?? "");
    setBodyHtml(item.body_html ?? "");
  }

  async function handleSubmit() {
    if (!editing || name.trim() === "" || subject.trim() === "") {
      toast.error("Nama dan subjek template wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      await emailTemplatesService.update(editing.id, {
        name: name.trim(),
        subject: subject.trim(),
        content_mode: mode,
        body_text: bodyText,
        body_html: bodyHtml,
      });
      toast.success("Template diperbarui");
      setEditing(null);
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
        title="Kelola Template"
        description="Kelola template email."
        path="/admin/email-templates"
        noindex
      />
      <PageTitle title="Kelola Template" desc="Template baru dibuat dari halaman Kirim Email." />
      <div className="mb-4">
        <input
          type="search"
          aria-label="Cari template"
          placeholder="Cari template..."
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          className="w-full max-w-sm rounded-full border border-input bg-background px-4 py-2 text-sm"
        />
      </div>

      {loading && !data ? (
        <LoadingState label="Memuat template..." />
      ) : error && !data ? (
        <ErrorState error={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Belum ada template"
          description="Buat template baru dari halaman Kirim Email."
        />
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            {items.map((item) => (
              <Card key={item.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.name}</p>
                    <p className="truncate text-sm text-muted-foreground">{item.subject}</p>
                  </div>
                  <Badge tone="secondary">{item.content_mode === "html" ? "HTML" : "Teks"}</Badge>
                </div>
                <div className="mt-3 flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => openEdit(item)}>
                    Ubah
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => setDeleting(item)}
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
            itemLabel="template"
          />
        </>
      )}

      <CrudModal
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        title="Ubah template"
        submitting={saving}
        onSubmit={() => void handleSubmit()}
        size="lg"
      >
        <Field label="Nama" required>
          <TextInput value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Subjek" required>
          <TextInput value={subject} onChange={(event) => setSubject(event.target.value)} />
        </Field>
        <EmailContentEditor
          mode={mode}
          bodyText={bodyText}
          bodyHtml={bodyHtml}
          onModeChange={setMode}
          onBodyTextChange={setBodyText}
          onBodyHtmlChange={setBodyHtml}
          variables={["nama", "email"]}
        />
      </CrudModal>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Hapus template ini?"
        description={deleting ? `"${deleting.name}" dihapus permanen.` : undefined}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await emailTemplatesService.remove(deleting.id);
            toast.success("Template dihapus");
            setDeleting(null);
            reload();
          } catch (requestError) {
            toast.error("Hapus gagal", {
              description:
                requestError instanceof ApiError
                  ? getUserFacingErrorMessage(requestError)
                  : undefined,
            });
          }
        }}
      />
    </>
  );
}
