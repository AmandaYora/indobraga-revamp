import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useApiQuery } from "@/shared/hooks/useApiQuery";
import { emailCampaignsService } from "@/modules/email/services/email.service";
import { useAuthStore } from "@/modules/auth";
import { PageTitle } from "@/shared/components/ui/page-title";
import { Card } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { TablePagination } from "@/shared/components/ui/pagination";
import { CrudModal } from "@/modules/content/components/CrudModal";
import { EmptyState, ErrorState, LoadingState } from "@/shared/components/feedback/states";
import { Seo } from "@/modules/site";
import { ApiError, getUserFacingErrorMessage } from "@/shared/services/api-error";
import { campaignStatusTone } from "@/modules/content";
import { formatDateId } from "@/shared/lib/date";
import type { ContractSchemas } from "@/shared/types/contract";

type Campaign = ContractSchemas["Campaign"];

const STATUS_OPTIONS = [
  { value: "all", label: "Semua" },
  { value: "draft", label: "Draf" },
  { value: "pending", label: "Menunggu" },
  { value: "processing", label: "Diproses" },
  { value: "completed", label: "Selesai" },
  { value: "failed", label: "Gagal" },
];

const STATUS_LABEL: Record<string, string> = {
  draft: "Draf",
  pending: "Menunggu",
  processing: "Diproses",
  completed: "Selesai",
  failed: "Gagal",
  cancelled: "Dibatalkan",
};

const POLL_INTERVAL_MS = 5000;

/**
 * FE-E07: search, filter status, pagination, polling 5 dtk selama ada
 * kampanye pending/processing dan tab terlihat; detail penerima + log
 * (permission `email_campaign_logs.read`); resend failed (permission
 * `email_campaigns.send`).
 */
export default function EmailHistoryPage() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canSeeLogs = hasPermission("email_campaign_logs.read");
  const canResend = hasPermission("email_campaigns.send");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [detail, setDetail] = useState<Campaign | null>(null);

  const { data, error, loading, reload, setData } = useApiQuery(
    ["admin", "email-campaigns", page, pageSize, query, statusFilter],
    () =>
      emailCampaignsService.list({
        page,
        limit: pageSize,
        ...(query.trim() ? { q: query.trim() } : {}),
        ...(statusFilter === "all" ? {} : { status: statusFilter }),
      }),
  );

  const items = data?.items ?? [];

  // Polling 5 dtk hanya selama ada kampanye pending/processing dan tab terlihat.
  useEffect(() => {
    const active = items.some((item) => item.status === "pending" || item.status === "processing");
    if (!active) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      void emailCampaignsService
        .list({
          page,
          limit: pageSize,
          ...(query.trim() ? { q: query.trim() } : {}),
          ...(statusFilter === "all" ? {} : { status: statusFilter }),
        })
        .then((result) => {
          setData({ items: result.items, pagination: result.pagination } as never);
        })
        .catch(() => undefined);
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, page, pageSize, query, statusFilter]);

  const pagination = data?.pagination ?? { page: 1, limit: pageSize, total: 0, total_pages: 1 };

  async function handleResend(item: Campaign) {
    try {
      await emailCampaignsService.resendFailed(item.id);
      toast.success("Penerima gagal dijadwalkan ulang");
      reload();
    } catch (requestError) {
      toast.error("Kirim ulang gagal", {
        description:
          requestError instanceof ApiError ? getUserFacingErrorMessage(requestError) : undefined,
      });
    }
  }

  return (
    <>
      <Seo
        title="Riwayat Email"
        description="Riwayat pengiriman email massal."
        path="/admin/email-history"
        noindex
      />
      <PageTitle title="Riwayat Email" desc="Pantau status pengiriman kampanye email." />
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="search"
          aria-label="Cari kampanye"
          placeholder="Cari kampanye..."
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
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {loading && !data ? (
        <LoadingState label="Memuat riwayat email..." />
      ) : error && !data ? (
        <ErrorState error={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Belum ada kampanye"
          description="Kirim email pertama dari halaman Kirim Email."
        />
      ) : (
        <>
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Nama</th>
                  <th className="px-4 py-2 font-medium">Pengirim</th>
                  <th className="px-4 py-2 font-medium">Penerima</th>
                  <th className="px-4 py-2 font-medium">Terkirim</th>
                  <th className="px-4 py-2 font-medium">Gagal</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Tanggal</th>
                  <th className="px-4 py-2 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="max-w-48 truncate px-4 py-2 font-medium">{item.title}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {item.sender_account?.email_address ?? "—"}
                    </td>
                    <td className="px-4 py-2">
                      {(item.total_recipients ?? 0).toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-2">{(item.sent_count ?? 0).toLocaleString("id-ID")}</td>
                    <td className="px-4 py-2">
                      {(item.failed_count ?? 0).toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-2">
                      <Badge tone={campaignStatusTone(item.status)}>
                        {STATUS_LABEL[item.status] ?? item.status}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">
                      {formatDateId(item.created_at, "short")}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => setDetail(item)}>
                          Detail
                        </Button>
                        {canResend && (item.failed_count ?? 0) > 0 ? (
                          <Button size="sm" variant="ghost" onClick={() => void handleResend(item)}>
                            Kirim Ulang yang Gagal
                          </Button>
                        ) : null}
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
            itemLabel="kampanye"
          />
        </>
      )}

      {detail ? (
        <CampaignDetailModal
          item={detail}
          canSeeLogs={canSeeLogs}
          onClose={() => setDetail(null)}
        />
      ) : null}
    </>
  );
}

function CampaignDetailModal({
  item,
  canSeeLogs,
  onClose,
}: {
  item: Campaign;
  canSeeLogs: boolean;
  onClose: () => void;
}) {
  const recipientsQuery = useApiQuery(["admin", "email-campaigns", item.id, "recipients"], () =>
    emailCampaignsService.recipients(item.id, { limit: 10 }),
  );
  const logsQuery = useApiQuery(
    ["admin", "email-campaigns", item.id, "logs"],
    () => emailCampaignsService.logs(item.id, { limit: 10 }),
    { enabled: canSeeLogs },
  );

  const recipients = recipientsQuery.data?.items ?? [];
  const logs = logsQuery.data?.items ?? [];

  return (
    <CrudModal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={item.title}
      description={`${item.sent_count ?? 0}/${item.total_recipients ?? 0} terkirim · ${item.failed_count ?? 0} gagal`}
      submitLabel="Tutup"
      onSubmit={onClose}
      size="lg"
    >
      <div>
        <h3 className="font-medium">Penerima</h3>
        {recipientsQuery.loading ? (
          <p className="mt-1 text-sm text-muted-foreground">Memuat penerima...</p>
        ) : recipients.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">Belum ada data penerima.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {recipients.map((recipient) => (
              <li key={recipient.id} className="flex items-center justify-between gap-2">
                <span className="truncate">
                  {recipient.name ? `${recipient.name} <${recipient.email}>` : recipient.email}
                </span>
                <Badge tone={campaignStatusTone(recipient.status)}>{recipient.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
      {canSeeLogs ? (
        <div>
          <h3 className="font-medium">Log pengiriman</h3>
          {logsQuery.loading ? (
            <p className="mt-1 text-sm text-muted-foreground">Memuat log...</p>
          ) : logs.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">Belum ada log.</p>
          ) : (
            <ul className="mt-2 space-y-1 font-mono text-xs">
              {logs.map((log) => (
                <li key={log.id} className="rounded-lg bg-muted/40 px-2 py-1">
                  {log.error_code ? `[${log.error_code}] ` : ""}
                  {log.error_message ?? `${log.recipient_email} — ${log.status}`}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </CrudModal>
  );
}
