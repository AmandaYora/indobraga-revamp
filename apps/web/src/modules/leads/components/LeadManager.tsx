import { useState } from "react";
import { toast } from "sonner";
import { useApiQuery } from "@/shared/hooks/useApiQuery";
import { PageTitle } from "@/shared/components/ui/page-title";
import { Card } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { TablePagination } from "@/shared/components/ui/pagination";
import {
  CrudModal,
  ConfirmDialog,
  Field,
  TextArea,
  Select,
} from "@/modules/content/components/CrudModal";
import { EmptyState, ErrorState, LoadingState } from "@/shared/components/feedback/states";
import { Seo } from "@/modules/site";
import { ApiError, getUserFacingErrorMessage } from "@/shared/services/api-error";
import { inquiryStatusTone } from "@/modules/content";
import { formatDateId } from "@/shared/lib/date";
import type { PageMeta } from "@/shared/services/http-client";
import type { ContractSchemas } from "@/shared/types/contract";

type LeadStatus = ContractSchemas["LeadStatus"];

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: "new", label: "Baru" },
  { value: "contacted", label: "Sudah Dihubungi" },
  { value: "in_progress", label: "Dalam Proses" },
  { value: "closed", label: "Selesai" },
  { value: "spam", label: "Spam" },
];

const STATUS_LABEL: Record<string, string> = Object.fromEntries(
  STATUS_OPTIONS.map((option) => [option.value, option.label]),
);

const FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "Semua" },
  ...STATUS_OPTIONS,
];

export interface LeadItem {
  id: number;
  status: string;
  internal_note?: string | null;
  created_at?: string | null;
}

export interface LeadManagerProps<T extends LeadItem> {
  title: string;
  description: string;
  itemLabel: string;
  seoPath: string;
  searchPlaceholder?: string;
  load: (params: {
    page: number;
    limit: number;
    q?: string;
    status?: LeadStatus;
  }) => Promise<{ items: T[]; pagination: PageMeta }>;
  update: (
    id: number,
    payload: { status?: LeadStatus; internal_note?: string },
  ) => Promise<unknown>;
  archive: (id: number) => Promise<unknown>;
  getContact: (item: T) => { name: string; detail: string };
  getMessage: (item: T) => string;
  emailAction?: (item: T) => void;
  whatsappAction?: (item: T) => void;
}

/**
 * Manager prospek generik: search, filter status, pagination server,
 * edit status + catatan internal, arsip, aksi kirim email/WhatsApp.
 */
export function LeadManager<T extends LeadItem>(props: LeadManagerProps<T>) {
  const {
    title,
    description,
    itemLabel,
    seoPath,
    searchPlaceholder = "Cari nama, kontak, atau pesan...",
  } = props;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [managing, setManaging] = useState<T | null>(null);
  const [manageStatus, setManageStatus] = useState<LeadStatus>("new");
  const [manageNote, setManageNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState<T | null>(null);

  const status = statusFilter === "all" ? undefined : (statusFilter as LeadStatus);
  const { data, error, loading, reload } = useApiQuery(
    ["admin-leads", itemLabel, page, pageSize, query, statusFilter],
    () =>
      props.load({
        page,
        limit: pageSize,
        ...(query.trim() ? { q: query.trim() } : {}),
        ...(status ? { status } : {}),
      }),
  );

  const items = data?.items ?? [];
  const pagination = data?.pagination ?? { page: 1, limit: pageSize, total: 0, total_pages: 1 };
  const start = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const end = Math.min(pagination.page * pagination.limit, pagination.total);

  function openManage(item: T) {
    setManaging(item);
    setManageStatus(
      (STATUS_OPTIONS.some((option) => option.value === item.status)
        ? item.status
        : "new") as LeadStatus,
    );
    setManageNote(item.internal_note ?? "");
  }

  async function saveManage() {
    if (!managing) return;
    setSaving(true);
    try {
      await props.update(managing.id, { status: manageStatus, internal_note: manageNote });
      toast.success(`${itemLabel} diperbarui`);
      setManaging(null);
      reload();
    } catch (saveError) {
      toast.error("Simpan gagal", {
        description:
          saveError instanceof ApiError ? getUserFacingErrorMessage(saveError) : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  async function confirmArchive() {
    if (!archiving) return;
    try {
      await props.archive(archiving.id);
      toast.success(`${itemLabel} diarsipkan`);
      setArchiving(null);
      reload();
    } catch (archiveError) {
      toast.error("Arsip gagal", {
        description:
          archiveError instanceof ApiError ? getUserFacingErrorMessage(archiveError) : undefined,
      });
    }
  }

  return (
    <>
      <Seo title={title} description={description} path={seoPath} noindex />
      <PageTitle title={title} desc={description} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          aria-label={`Cari ${itemLabel}`}
          placeholder={searchPlaceholder}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          className="w-full max-w-sm rounded-full border border-input bg-background px-4 py-2 text-sm"
        />
        <select
          aria-label="Filter status"
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value);
            setPage(1);
          }}
          className="rounded-full border border-input bg-background px-4 py-2 text-sm"
        >
          {FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {loading && !data ? (
        <LoadingState label={`Memuat ${itemLabel}...`} />
      ) : error && !data ? (
        <ErrorState error={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <EmptyState
          title={`Tidak ada ${itemLabel}`}
          description="Coba filter atau kata kunci lain."
        />
      ) : (
        <>
          <div className="grid gap-3 lg:hidden">
            {items.map((item) => (
              <LeadCard
                key={item.id}
                item={item}
                getContact={props.getContact}
                getMessage={props.getMessage}
                emailAction={props.emailAction}
                whatsappAction={props.whatsappAction}
                onManage={() => openManage(item)}
                onArchive={() => setArchiving(item)}
              />
            ))}
          </div>
          <Card className="hidden lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Kontak</th>
                  <th className="px-4 py-2 font-medium">Pesan</th>
                  <th className="px-4 py-2 font-medium">Tanggal</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const contact = props.getContact(item);
                  return (
                    <tr key={item.id} className="border-b align-top last:border-0">
                      <td className="px-4 py-2">
                        <p className="font-medium">{contact.name}</p>
                        <p className="text-xs text-muted-foreground">{contact.detail}</p>
                      </td>
                      <td className="max-w-xs px-4 py-2">
                        <p className="line-clamp-3 text-muted-foreground">
                          {props.getMessage(item)}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">
                        {item.created_at ? formatDateId(item.created_at, "short") : "—"}
                      </td>
                      <td className="px-4 py-2">
                        <Badge tone={inquiryStatusTone(item.status)}>
                          {STATUS_LABEL[item.status] ?? item.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2">
                        <LeadActions
                          item={item}
                          emailAction={props.emailAction}
                          whatsappAction={props.whatsappAction}
                          onManage={() => openManage(item)}
                          onArchive={() => setArchiving(item)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
          <TablePagination
            page={pagination.page}
            pageCount={Math.max(1, pagination.total_pages)}
            pageSize={pagination.limit}
            total={pagination.total}
            start={start}
            end={end}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
            itemLabel={itemLabel}
          />
        </>
      )}

      <CrudModal
        open={managing !== null}
        onOpenChange={(open) => {
          if (!open) setManaging(null);
        }}
        title={`Kelola ${itemLabel}`}
        onSubmit={() => void saveManage()}
        submitting={saving}
      >
        <Field label="Status">
          <Select
            value={manageStatus}
            onChange={(event) => setManageStatus(event.target.value as LeadStatus)}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Catatan Admin" hint="Hanya terlihat oleh admin.">
          <TextArea
            value={manageNote}
            rows={4}
            onChange={(event) => setManageNote(event.target.value)}
          />
        </Field>
      </CrudModal>

      <ConfirmDialog
        open={archiving !== null}
        onOpenChange={(open) => {
          if (!open) setArchiving(null);
        }}
        title={`Arsipkan ${itemLabel} ini?`}
        description="Item yang diarsipkan tidak tampil di daftar aktif."
        confirmLabel="Arsipkan"
        onConfirm={() => void confirmArchive()}
      />
    </>
  );
}

function LeadActions<T extends LeadItem>({
  item,
  emailAction,
  whatsappAction,
  onManage,
  onArchive,
}: {
  item: T;
  emailAction?: (item: T) => void;
  whatsappAction?: (item: T) => void;
  onManage: () => void;
  onArchive: () => void;
}) {
  const actions: { label: string; run: () => void }[] = [];
  if (emailAction) actions.push({ label: "Kirim Email", run: () => emailAction(item) });
  if (whatsappAction) actions.push({ label: "Kirim WhatsApp", run: () => whatsappAction(item) });
  return (
    <div className="flex justify-end gap-1">
      <Button size="sm" variant="outline" onClick={onManage}>
        Kelola
      </Button>
      {actions.length === 1 ? (
        <Button size="sm" variant="ghost" onClick={actions[0].run}>
          {actions[0].label}
        </Button>
      ) : actions.length > 1 ? (
        <>
          {actions.map((action) => (
            <Button key={action.label} size="sm" variant="ghost" onClick={action.run}>
              {action.label}
            </Button>
          ))}
        </>
      ) : null}
      <Button size="sm" variant="ghost" onClick={onArchive}>
        Arsip
      </Button>
    </div>
  );
}

function LeadCard<T extends LeadItem>({
  item,
  getContact,
  getMessage,
  emailAction,
  whatsappAction,
  onManage,
  onArchive,
}: {
  item: T;
  getContact: (item: T) => { name: string; detail: string };
  getMessage: (item: T) => string;
  emailAction?: (item: T) => void;
  whatsappAction?: (item: T) => void;
  onManage: () => void;
  onArchive: () => void;
}) {
  const contact = getContact(item);
  return (
    <Card>
      <p className="font-medium">{contact.name}</p>
      <p className="text-xs text-muted-foreground">{contact.detail}</p>
      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{getMessage(item)}</p>
      <div className="mt-2 flex items-center gap-2">
        <Badge tone={inquiryStatusTone(item.status)}>
          {STATUS_LABEL[item.status] ?? item.status}
        </Badge>
        {item.created_at ? (
          <span className="text-xs text-muted-foreground">
            {formatDateId(item.created_at, "short")}
          </span>
        ) : null}
      </div>
      <div className="mt-3">
        <LeadActions
          item={item}
          emailAction={emailAction}
          whatsappAction={whatsappAction}
          onManage={onManage}
          onArchive={onArchive}
        />
      </div>
    </Card>
  );
}
