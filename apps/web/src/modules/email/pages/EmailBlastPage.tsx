import { useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useApiQuery } from "@/shared/hooks/useApiQuery";
import {
  emailAccountsService,
  emailCampaignsService,
  emailTemplatesService,
} from "@/modules/email/services/email.service";
import { EmailContentEditor } from "@/modules/email/components/EmailContentEditor";
import {
  EMPTY_IMPORT,
  RECIPIENT_LIMIT,
  RECIPIENT_TEMPLATE_HEADERS,
  RECIPIENT_TEMPLATE_SAMPLE,
  buildRecipientImport,
  buildSingleTitle,
  findMissingTemplateVariables,
  renderTemplate,
  resolveBodyPayload,
  selectedAccountLabel,
  validateBulk,
  validateSingle,
  type ContentMode,
  type EmailTab,
  type RecipientImportState,
} from "@/modules/email/lib/recipients";
import { PageTitle } from "@/shared/components/ui/page-title";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { CrudModal, ConfirmDialog, Field, TextInput, Select } from "@/modules/content";
import { Seo } from "@/modules/site";
import { emailBlastSearchSchema } from "@/modules/email/schemas/email-blast-search.schema";
import { ApiError } from "@/shared/services/api-error";
import { ErrorState, LoadingState } from "@/shared/components/feedback/states";
import { cn } from "@/shared/lib/cn";
import type { ContractSchemas } from "@/shared/types/contract";

type RecipientPayload = { email: string; name?: string; variables: Record<string, string> };

/**
 * FE-E02/E03/E04/E05: tab Single & Bulk; template & simpan template;
 * EmailContentEditor; import/unduh XLSX; preview {{var}}; draft & kirim.
 */
export default function EmailBlastPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  // Search params ber-Zod: tab/email/name (invalid → default).
  const parsedSearch = emailBlastSearchSchema.parse(Object.fromEntries(searchParams.entries()));
  const tab: EmailTab = parsedSearch.tab;

  const accountsQuery = useApiQuery(["admin", "email-accounts", "connected"], () =>
    emailAccountsService.connectedAccounts(),
  );
  const templatesQuery = useApiQuery(["admin", "email-templates", "options"], () =>
    emailTemplatesService.list({ limit: 100 }),
  );

  const [accountId, setAccountId] = useState("");
  const [subject, setSubject] = useState("");
  const [mode, setMode] = useState<ContentMode>("text");
  const [bodyText, setBodyText] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [toEmail, setToEmail] = useState(parsedSearch.email ?? "");
  const [toName, setToName] = useState(parsedSearch.name ?? "");
  const [prevSearch, setPrevSearch] = useState(searchParams.toString());

  // Sinkron prefill dari search params (adjust during render).
  if (searchParams.toString() !== prevSearch) {
    const next = emailBlastSearchSchema.parse(Object.fromEntries(searchParams.entries()));
    setPrevSearch(searchParams.toString());
    setToEmail(next.email ?? "");
    setToName(next.name ?? "");
  }
  const [bulkTitle, setBulkTitle] = useState("");
  const [importState, setImportState] = useState<RecipientImportState>(EMPTY_IMPORT);
  const [templateId, setTemplateId] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [sending, setSending] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function setTab(next: EmailTab) {
    const params = new URLSearchParams(searchParams);
    params.set("tab", next);
    setSearchParams(params, { replace: true });
  }

  /** Validasi dulu sebelum membuka konfirmasi kirim. */
  function handleKirimClick() {
    if (!validateOrToast()) return;
    setConfirmSend(true);
  }

  const accounts = accountsQuery.data ?? [];
  const templates = templatesQuery.data?.items ?? [];

  const recipients: RecipientPayload[] =
    tab === "single"
      ? toEmail.trim() !== ""
        ? [
            {
              email: toEmail.trim().toLowerCase(),
              ...(toName.trim() ? { name: toName.trim() } : {}),
              variables: { nama: toName.trim(), email: toEmail.trim().toLowerCase() },
            },
          ]
        : []
      : importState.validRecipients.map((row) => ({
          email: row.email,
          ...(row.name ? { name: row.name } : {}),
          variables: row.variables,
        }));

  const missingVariables = findMissingTemplateVariables(
    [subject, bodyText, bodyHtml],
    [...importState.variableKeys, "nama", "email", ...(tab === "single" ? ["nama", "email"] : [])],
  );

  function applyTemplate(id: string) {
    setTemplateId(id);
    const template = templates.find((entry) => String(entry.id) === id);
    if (!template) return;
    setSubject(template.subject);
    setMode(template.content_mode === "html" ? "html" : "text");
    setBodyText(template.body_text ?? "");
    setBodyHtml(template.body_html ?? "");
    toast.success("Template dipakai");
  }

  async function handleImportFile(file: File | undefined) {
    if (!file) return;
    try {
      const { default: readXlsxFile } = await import("read-excel-file/browser");
      const rows = (await readXlsxFile(file)) as unknown[][];
      setImportState(buildRecipientImport(rows, file.name));
    } catch {
      setImportState({
        ...EMPTY_IMPORT,
        fileName: file.name,
        error: "File tidak bisa dibaca sebagai Excel.",
      });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDownloadTemplate() {
    try {
      const { default: writeXlsxFile } = await import("write-excel-file/browser");
      await writeXlsxFile([RECIPIENT_TEMPLATE_HEADERS, ...RECIPIENT_TEMPLATE_SAMPLE], {
        fileName: "template-penerima-email-indobraga.xlsx",
      });
    } catch {
      toast.error("Template XLSX gagal diunduh");
    }
  }

  async function handleSaveTemplate() {
    if (templateName.trim() === "" || subject.trim() === "") {
      toast.error("Nama template dan subjek wajib diisi.");
      return;
    }
    const payload = resolveBodyPayload({
      content_mode: mode,
      body_text: bodyText,
      body_html: bodyHtml,
    });
    try {
      await emailTemplatesService.create({
        name: templateName.trim(),
        subject: subject.trim(),
        content_mode: mode,
        ...payload,
      });
      toast.success("Template disimpan");
      setSaveTemplateOpen(false);
      setTemplateName("");
      void templatesQuery.reload();
    } catch (requestError) {
      toast.error("Simpan template gagal", {
        description: requestError instanceof ApiError ? requestError.message : undefined,
      });
    }
  }

  function validateOrToast(): { payload: ContractSchemas["CampaignDraftInput"] } | null {
    const base = {
      email_account_id: accountId,
      subject: subject.trim(),
      content_mode: mode,
      body_text: bodyText,
      body_html: bodyHtml,
    };
    if (tab === "single") {
      const error = validateSingle({ ...base, to_email: toEmail });
      if (error) {
        toast.error(error.title, { description: error.description });
        return null;
      }
      const body = resolveBodyPayload({
        content_mode: mode,
        body_text: bodyText,
        body_html: bodyHtml,
      });
      const recipient = recipients[0];
      return {
        payload: {
          title: buildSingleTitle(recipient.email),
          email_account_id: Number(accountId),
          subject: subject.trim(),
          ...body,
          recipients: [
            {
              email: recipient.email,
              ...(recipient.name ? { name: recipient.name } : {}),
              variables: recipient.variables,
            },
          ],
        },
      };
    }
    const error = validateBulk({ ...base, title: bulkTitle }, importState);
    if (error) {
      toast.error(error.title, { description: error.description });
      return null;
    }
    const body = resolveBodyPayload({
      content_mode: mode,
      body_text: bodyText,
      body_html: bodyHtml,
    });
    return {
      payload: {
        title: bulkTitle.trim(),
        email_account_id: Number(accountId),
        subject: subject.trim(),
        ...body,
        recipients: recipients.map((recipient) => ({
          email: recipient.email,
          ...(recipient.name ? { name: recipient.name } : {}),
          variables: recipient.variables,
        })),
      },
    };
  }

  async function handleSend() {
    const validated = validateOrToast();
    if (!validated) {
      setConfirmSend(false);
      return;
    }
    setSending(true);
    try {
      const draft = await emailCampaignsService.createDraft(validated.payload);
      await emailCampaignsService.send(draft.id);
      toast.success(`Email dikirim ke ${draft.total_recipients} penerima`);
      setConfirmSend(false);
    } catch (requestError) {
      toast.error("Kirim gagal", {
        description: requestError instanceof ApiError ? requestError.message : undefined,
      });
    } finally {
      setSending(false);
    }
  }

  async function handleSaveDraft() {
    const validated = validateOrToast();
    if (!validated) return;
    setSending(true);
    try {
      const draft = await emailCampaignsService.createDraft(validated.payload);
      toast.success(`Draf tersimpan (${draft.total_recipients} penerima)`);
    } catch (requestError) {
      toast.error("Simpan draf gagal", {
        description: requestError instanceof ApiError ? requestError.message : undefined,
      });
    } finally {
      setSending(false);
    }
  }

  const previewVariables: Record<string, string> =
    tab === "single"
      ? { nama: toName.trim() || "Penerima", email: toEmail.trim() }
      : (recipients[0]?.variables ?? {});
  const previewBody = resolveBodyPayload({
    content_mode: mode,
    body_text: bodyText,
    body_html: bodyHtml,
  });
  const previewHtml = renderTemplate(
    mode === "html" ? previewBody.body_html : previewBody.body_text,
    previewVariables,
  );

  if (accountsQuery.loading && !accountsQuery.data)
    return <LoadingState label="Memuat akun pengirim..." />;
  if (accountsQuery.error && !accountsQuery.data) {
    return <ErrorState error={accountsQuery.error} onRetry={accountsQuery.reload} />;
  }

  return (
    <>
      <Seo
        title="Kirim Email"
        description="Kirim email tunggal atau massal."
        path="/admin/email-blast"
        noindex
      />
      <PageTitle
        title="Kirim Email"
        desc="Kirim email tunggal ke satu tujuan atau massal ke daftar penerima."
      />
      <div className="mb-4 flex gap-2" role="group" aria-label="Tab pengiriman">
        {(["single", "bulk"] as EmailTab[]).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={tab === value}
            onClick={() => setTab(value)}
            className={cn(
              "rounded-full border px-5 py-1.5 text-sm",
              tab === value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input hover:bg-muted",
            )}
          >
            {value === "single" ? "Tunggal" : "Massal"}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="space-y-4 lg:col-span-2">
          {tab === "single" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="blast-email" className="mb-1 block text-sm font-medium">
                  Email tujuan
                </label>
                <TextInput
                  id="blast-email"
                  type="email"
                  value={toEmail}
                  onChange={(event) => setToEmail(event.target.value)}
                  placeholder="nama@email.com"
                />
              </div>
              <div>
                <label htmlFor="blast-name" className="mb-1 block text-sm font-medium">
                  Nama penerima{" "}
                  <span className="font-normal text-muted-foreground">(untuk {"{{nama}}"})</span>
                </label>
                <TextInput
                  id="blast-name"
                  value={toName}
                  onChange={(event) => setToName(event.target.value)}
                  placeholder="Nama penerima"
                />
              </div>
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="blast-title" className="mb-1 block text-sm font-medium">
                  Nama pengiriman
                </label>
                <TextInput
                  id="blast-title"
                  value={bulkTitle}
                  onChange={(event) => setBulkTitle(event.target.value)}
                  placeholder="Promo bulan ini"
                />
              </div>
              <div>
                <p className="mb-1 text-sm font-medium">Daftar penerima (XLSX)</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" onClick={() => fileRef.current?.click()}>
                    {importState.fileName ? "Ganti file" : "Unggah XLSX"}
                  </Button>
                  <Button variant="ghost" onClick={() => void handleDownloadTemplate()}>
                    Unduh template XLSX
                  </Button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".xlsx"
                    className="hidden"
                    aria-label="File penerima XLSX"
                    onChange={(event) => void handleImportFile(event.target.files?.[0])}
                  />
                </div>
                {importState.fileName ? (
                  <div className="mt-2 text-xs text-muted-foreground">
                    <p>
                      {importState.fileName} — {importState.rowsRead} baris dibaca,{" "}
                      {importState.validRecipients.length} email valid
                      {importState.duplicateCount > 0
                        ? `, ${importState.duplicateCount} duplikat dibuang`
                        : ""}
                      {importState.validRecipients.length > RECIPIENT_LIMIT
                        ? ` (melebihi batas ${RECIPIENT_LIMIT})`
                        : ""}
                      .
                    </p>
                    {importState.error ? (
                      <p className="text-destructive">{importState.error}</p>
                    ) : null}
                    {importState.invalidRows.length > 0 ? (
                      <ul className="mt-1 max-h-24 list-disc overflow-y-auto pl-4">
                        {importState.invalidRows.slice(0, 20).map((row) => (
                          <li key={row.row}>
                            Baris {row.row}: {row.reason}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </>
          )}
          <div>
            <label htmlFor="blast-account" className="mb-1 block text-sm font-medium">
              Akun pengirim
            </label>
            <Select
              id="blast-account"
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
            >
              <option value="">Pilih akun...</option>
              {accounts.map((account) => (
                <option key={account.id} value={String(account.id)}>
                  {selectedAccountLabel(String(account.id), accounts)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="blast-subject" className="mb-1 block text-sm font-medium">
              Subjek
            </label>
            <TextInput
              id="blast-subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Subjek email"
            />
          </div>
          <EmailContentEditor
            mode={mode}
            bodyText={bodyText}
            bodyHtml={bodyHtml}
            onModeChange={setMode}
            onBodyTextChange={setBodyText}
            onBodyHtmlChange={setBodyHtml}
            variables={[
              "nama",
              "email",
              ...importState.variableKeys.filter((key) => key !== "nama" && key !== "email"),
            ]}
          />
          {missingVariables.length > 0 && tab === "bulk" ? (
            <p
              role="alert"
              className="rounded-xl bg-warning/10 px-4 py-2 text-sm text-warning-strong"
            >
              Variabel {missingVariables.map((variable) => `{{${variable}}}`).join(", ")} tidak ada
              di file penerima dan akan dikirim kosong.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setPreviewOpen(true)}>
              Pratinjau
            </Button>
            <Button variant="outline" onClick={() => void handleSaveDraft()} disabled={sending}>
              {sending ? "Menyimpan..." : "Simpan Draf"}
            </Button>
            <Button onClick={handleKirimClick} disabled={sending}>
              {sending ? "Memproses..." : "Kirim"}
            </Button>
          </div>
        </Card>
        <Card>
          <h2 className="font-semibold">Template</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Pakai template tersimpan atau simpan konten ini sebagai template.
          </p>
          <div className="mt-3">
            <label htmlFor="blast-template" className="mb-1 block text-sm font-medium">
              Pilih template
            </label>
            <Select
              id="blast-template"
              value={templateId}
              onChange={(event) => applyTemplate(event.target.value)}
            >
              <option value="">Tanpa template</option>
              {templates.map((template) => (
                <option key={template.id} value={String(template.id)}>
                  {template.name}
                </option>
              ))}
            </Select>
          </div>
          <Button
            variant="outline"
            className="mt-3 w-full"
            onClick={() => {
              setTemplateName(subject);
              setSaveTemplateOpen(true);
            }}
          >
            Simpan sebagai Template
          </Button>
        </Card>
      </div>

      <CrudModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title="Pratinjau email"
        description={
          tab === "bulk" && recipients[0]
            ? `Variabel diisi dari ${recipients[0].email}.`
            : undefined
        }
        submitLabel="Tutup"
        onSubmit={() => setPreviewOpen(false)}
        size="lg"
      >
        <p className="text-sm font-medium">{renderTemplate(subject, previewVariables)}</p>
        {mode === "html" ? (
          <iframe
            title="Pratinjau isi email"
            sandbox=""
            srcDoc={previewHtml}
            className="h-72 w-full rounded-lg border bg-white"
          />
        ) : (
          <p className="whitespace-pre-wrap rounded-lg border bg-muted/40 p-4 text-sm">
            {previewHtml}
          </p>
        )}
      </CrudModal>

      <ConfirmDialog
        open={confirmSend}
        onOpenChange={setConfirmSend}
        title="Kirim email sekarang?"
        description={`Email akan dikirim ke ${recipients.length} penerima dan tidak bisa dibatalkan.`}
        confirmLabel="Ya, kirim"
        confirming={sending}
        onConfirm={() => void handleSend()}
      />

      <CrudModal
        open={saveTemplateOpen}
        onOpenChange={setSaveTemplateOpen}
        title="Simpan sebagai template"
        submitLabel="Simpan template"
        onSubmit={() => void handleSaveTemplate()}
      >
        <Field label="Nama template" required>
          <TextInput
            value={templateName}
            onChange={(event) => setTemplateName(event.target.value)}
            placeholder="Promo bulanan"
          />
        </Field>
      </CrudModal>
    </>
  );
}
