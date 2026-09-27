import { useCallback, useEffect, useState } from "react";
import { Eye, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { useApiQuery } from "@/shared/hooks/useApiQuery";
import { emailCampaignsService } from "@/modules/email/services/email.service";
import { useAuthStore } from "@/modules/auth";
import { PageTitle } from "@/shared/components/ui/page-title";
import { Card } from "@/shared/components/ui/card";
import { PrimaryButton } from "@/shared/components/ui/action-buttons";
import { ActionButtonGroup, IconActionButton } from "@/shared/components/ui/icon-action-button";
import { TablePagination } from "@/shared/components/ui/pagination";
import { ConfirmDialog, CrudModal } from "@/modules/content/components/CrudModal";
import { StatusBadge } from "@/modules/content/components/StatusBadge";
import { campaignStatus, emailDeliveryStatus } from "@/modules/content/lib/status-map";
import { EmptyState, ErrorState, LoadingState } from "@/shared/components/feedback/states";
import { Seo } from "@/modules/site";
import { getUserFacingErrorMessage } from "@/shared/services/api-error";
import { formatDateId } from "@/shared/lib/date";
import type { ContractSchemas } from "@/shared/types/contract";

type EmailCampaign = ContractSchemas["Campaign"];

const EMPTY_PAGE = { page: 1, limit: 10, total: 0, total_pages: 1 };

/**
 * Port `routes/admin.email-history.tsx` legacy — markup, teks, toast, kelas 1:1. Izin dibaca dari
 * store sesi (BC-26) alih-alih fetch `me` per halaman.
 */
export default function EmailHistoryPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<EmailCampaign | null>(null);
  const [resendTarget, setResendTarget] = useState<EmailCampaign | null>(null);
  const [resending, setResending] = useState(false);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canViewLogs = hasPermission("email_campaign_logs.read");
  const canSend = hasPermission("email_campaigns.send");
  const loadCampaigns = useCallback(
    () =>
      emailCampaignsService.list({
        page,
        limit: pageSize,
        q: query || undefined,
        status: status === "all" ? undefined : status,
      }),
    [page, pageSize, query, status],
  );
  const campaigns = useApiQuery(
    ["admin", "email-campaigns", page, pageSize, query, status],
    loadCampaigns,
  );
  const recipients = useApiQuery(
    ["campaign-recipients", selected?.id],
    () =>
      selected
        ? emailCampaignsService.recipients(selected.id, { limit: 10 })
        : Promise.resolve({ items: [], pagination: EMPTY_PAGE }),
    { enabled: Boolean(selected) },
  );
  const logs = useApiQuery(
    ["campaign-logs", selected?.id],
    () =>
      selected && canViewLogs
        ? emailCampaignsService.logs(selected.id, { limit: 10 })
        : Promise.resolve({ items: [], pagination: EMPTY_PAGE }),
    { enabled: Boolean(selected && canViewLogs) },
  );

  const doResend = async () => {
    if (!resendTarget) {
      return;
    }
    setResending(true);
    try {
      const updated = await emailCampaignsService.resendFailed(resendTarget.id);
      toast.success(`Mengirim ulang ${resendTarget.failed_count} email yang gagal`);
      setResendTarget(null);
      setSelected(updated);
      campaigns.reload();
      recipients.reload();
      if (canViewLogs) {
        logs.reload();
      }
    } catch (error) {
      toast.error("Gagal mengirim ulang email", {
        description: getUserFacingErrorMessage(error, { action: "send" }),
      });
    } finally {
      setResending(false);
    }
  };

  const list = campaigns.data?.items ?? [];
  const pagination = campaigns.data?.pagination;
  const start =
    pagination && pagination.total > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const end = pagination ? Math.min(pagination.page * pagination.limit, pagination.total) : 0;
  // Hanya kampanye yang masih berjalan yang bisa berubah status, jadi polling hanya untuk itu.
  const hasActiveCampaigns = list.some(
    (campaign) => campaign.status === "pending" || campaign.status === "processing",
  );
  const setCampaignData = campaigns.setData;

  // Legacy me-reset ke halaman 1 saat ukuran halaman / pencarian / status berubah.
  const changeQuery = (value: string) => {
    setQuery(value);
    setPage(1);
  };
  const changeStatus = (value: string) => {
    setStatus(value);
    setPage(1);
  };
  const changePageSize = (value: number) => {
    setPageSize(value);
    setPage(1);
  };

  // Status langsung: selama ada kampanye pending/processing, segarkan daftar diam-diam (via
  // setData, tanpa kedip loading) tiap 5 dtk; dijeda saat tab tersembunyi. Berhenti sendiri
  // setelah semua mencapai status akhir. `cancelled` membuang respons basi (filter/halaman berganti).
  useEffect(() => {
    if (!hasActiveCampaigns) {
      return;
    }
    let cancelled = false;
    const poll = async () => {
      if (document.hidden) {
        return;
      }
      try {
        const fresh = await loadCampaigns();
        if (!cancelled) {
          setCampaignData(fresh);
        }
      } catch {
        // Abaikan kegagalan polling sesaat; tick berikutnya mencoba lagi.
      }
    };
    const timer = setInterval(() => void poll(), 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [hasActiveCampaigns, loadCampaigns, setCampaignData]);

  return (
    <>
      <Seo
        title="Riwayat Email"
        description="Riwayat pengiriman email massal."
        path="/admin/email-history"
        noindex
      />
      <PageTitle
        title="Riwayat Email"
        desc="Pantau email yang sudah dibuat, penerima, dan hasil pengirimannya."
      />
      <Card className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 basis-full sm:basis-auto">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => changeQuery(event.target.value)}
            placeholder="Cari nama pengiriman..."
            aria-label="Cari nama pengiriman"
            className="w-full rounded-full border border-border bg-secondary py-2 pl-10 pr-4 text-sm outline-none focus:border-primary"
          />
        </div>
        <select
          value={status}
          onChange={(event) => changeStatus(event.target.value)}
          aria-label="Filter status"
          className="max-w-full rounded-full border border-border bg-secondary px-4 py-2 text-sm"
        >
          <option value="all">Semua Status</option>
          <option value="draft">Draf</option>
          <option value="pending">Menunggu</option>
          <option value="processing">Mengirim</option>
          <option value="completed">Selesai</option>
          <option value="failed">Gagal</option>
        </select>
      </Card>
      {campaigns.loading && !campaigns.data && <LoadingState label="Memuat riwayat email..." />}
      {campaigns.error && <ErrorState error={campaigns.error} onRetry={campaigns.reload} />}

      <div className="grid gap-3 lg:hidden">
        {list.length === 0 && !campaigns.loading && (
          <Card>
            <EmptyState title="Belum ada riwayat email" />
          </Card>
        )}
        {list.map((campaign) => (
          <Card key={campaign.id}>
            <CampaignSummary campaign={campaign} onOpen={() => setSelected(campaign)} />
          </Card>
        ))}
      </div>

      <Card className="hidden overflow-hidden p-0 lg:block">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-4 text-left">Nama Pengiriman</th>
              <th className="p-4 text-left">Pengirim</th>
              <th className="p-4 text-right">Penerima</th>
              <th className="p-4 text-right">Terkirim</th>
              <th className="p-4 text-right">Gagal</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">Tanggal</th>
              <th className="p-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.map((campaign) => (
              <tr key={campaign.id}>
                <td className="p-4 font-semibold">{campaign.title}</td>
                <td className="p-4 text-muted-foreground">
                  {campaign.sender_account.email_address}
                </td>
                <td className="p-4 text-right">{campaign.total_recipients}</td>
                <td className="p-4 text-right text-success">{campaign.sent_count}</td>
                <td className="p-4 text-right text-destructive">{campaign.failed_count}</td>
                <td className="p-4">
                  <StatusBadge display={campaignStatus(campaign.status)} />
                </td>
                <td className="p-4 text-muted-foreground">{formatDateId(campaign.created_at)}</td>
                <td className="p-4 text-right">
                  <ActionButtonGroup className="justify-end">
                    <IconActionButton
                      label={`Lihat detail email ${campaign.title}`}
                      tooltip="Lihat detail"
                      onClick={() => setSelected(campaign)}
                      icon={<Eye className="h-4 w-4" />}
                    />
                  </ActionButtonGroup>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && !campaigns.loading && <EmptyState title="Belum ada riwayat email" />}
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
            itemLabel="email"
          />
        </div>
      )}

      <CrudModal
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
        title={selected ? selected.title : "Detail Email"}
        submitLabel="Tutup"
        onSubmit={() => setSelected(null)}
        size="xl"
      >
        {selected && canSend && selected.failed_count > 0 && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/40 bg-warning/10 p-3">
            <p className="text-sm">
              <span className="font-semibold text-destructive">{selected.failed_count}</span> email
              gagal terkirim. Kirim ulang hanya ke penerima yang gagal (yang sudah terkirim tidak
              dikirim lagi).
            </p>
            {/* Seperti legacy: tombol tanpa `type` = submit form CrudModal → detail tertutup selama
                konfirmasi, lalu dibuka lagi dengan data terbaru setelah kirim ulang berhasil. */}
            <PrimaryButton onClick={() => setResendTarget(selected)}>
              <RefreshCw className="h-4 w-4" /> Kirim Ulang yang Gagal
            </PrimaryButton>
          </div>
        )}
        {selected && (
          <div className={`grid gap-4 ${canViewLogs ? "lg:grid-cols-2" : ""}`}>
            <Card className="shadow-none">
              <h3 className="mb-3 font-semibold">Penerima</h3>
              {recipients.loading && (
                <p className="text-sm text-muted-foreground">Memuat penerima...</p>
              )}
              {recipients.data?.items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between gap-3 border-b border-border py-2 text-sm last:border-0"
                >
                  <span className="text-anywhere">
                    {item.name ? `${item.name} - ${item.email}` : item.email}
                  </span>
                  <StatusBadge display={emailDeliveryStatus(item.status)} />
                </div>
              ))}
            </Card>
            {canViewLogs && (
              <Card className="shadow-none">
                <h3 className="mb-3 font-semibold">Log Pengiriman</h3>
                {logs.loading && <p className="text-sm text-muted-foreground">Memuat log...</p>}
                {logs.data?.items.map((item) => (
                  <div key={item.id} className="border-b border-border py-2 text-sm last:border-0">
                    <div className="flex justify-between gap-3">
                      <span className="text-anywhere">{item.recipient_email ?? "-"}</span>
                      <StatusBadge display={emailDeliveryStatus(item.status)} />
                    </div>
                    {(item.error_message || item.error_code) && (
                      <p className="text-anywhere mt-1 text-xs text-destructive">
                        {item.error_code ? `[${item.error_code}] ` : ""}
                        {item.error_message ?? "Pengiriman gagal. Cek akun pengirim."}
                      </p>
                    )}
                  </div>
                ))}
              </Card>
            )}
          </div>
        )}
      </CrudModal>

      <ConfirmDialog
        open={Boolean(resendTarget)}
        onOpenChange={(open) => !open && !resending && setResendTarget(null)}
        title="Kirim ulang email yang gagal?"
        description={
          resendTarget
            ? `${resendTarget.failed_count} email yang gagal akan dikirim ulang ke penerimanya. Email yang sudah berhasil terkirim tidak akan dikirim lagi.`
            : ""
        }
        confirmLabel={resending ? "Mengirim..." : "Kirim Ulang"}
        destructive={false}
        onConfirm={doResend}
      />
    </>
  );
}

function CampaignSummary({ campaign, onOpen }: { campaign: EmailCampaign; onOpen: () => void }) {
  return (
    <>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-anywhere font-semibold">{campaign.title}</p>
          <p className="text-anywhere text-xs text-muted-foreground">
            {campaign.sender_account.email_address}
          </p>
          <p className="text-xs text-muted-foreground">{formatDateId(campaign.created_at)}</p>
        </div>
        <div className="shrink-0">
          <StatusBadge display={campaignStatus(campaign.status)} />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-secondary p-2">
          <p className="font-semibold text-foreground">{campaign.total_recipients}</p>
          <p className="text-muted-foreground">Penerima</p>
        </div>
        <div className="rounded-lg bg-success/10 p-2">
          <p className="font-semibold text-success">{campaign.sent_count}</p>
          <p className="text-muted-foreground">Terkirim</p>
        </div>
        <div className="rounded-lg bg-destructive/10 p-2">
          <p className="font-semibold text-destructive">{campaign.failed_count}</p>
          <p className="text-muted-foreground">Gagal</p>
        </div>
      </div>
      <ActionButtonGroup className="mt-3 justify-start">
        <IconActionButton
          label={`Lihat detail email ${campaign.title}`}
          tooltip="Lihat detail"
          onClick={onOpen}
          icon={<Eye className="h-4 w-4" />}
        />
      </ActionButtonGroup>
    </>
  );
}
