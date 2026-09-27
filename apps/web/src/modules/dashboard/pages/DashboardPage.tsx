import { Link } from "react-router-dom";
import { PageTitle } from "@/shared/components/ui/page-title";
import { Card } from "@/shared/components/ui/card";
import { Seo } from "@/modules/site";
import { useApiQuery } from "@/shared/hooks/useApiQuery";
import { dashboardService } from "@/modules/dashboard/services/dashboard.service";
import { inquiryStatusTone, campaignStatusTone } from "@/modules/content/lib/status-map";
import { Badge } from "@/shared/components/ui/badge";
import { formatDateId } from "@/shared/lib/date";
import { ROUTE_PATHS } from "@/app/routes/route-paths";
import { ErrorState, LoadingState } from "@/shared/components/feedback/states";

const INQUIRY_STATUS_LABEL: Record<string, string> = {
  new: "Baru",
  contacted: "Sudah Dihubungi",
  in_progress: "Dalam Proses",
  closed: "Selesai",
  spam: "Spam",
};

const CAMPAIGN_STATUS_LABEL: Record<string, string> = {
  draft: "Draf",
  pending: "Menunggu",
  processing: "Diproses",
  completed: "Selesai",
  failed: "Gagal",
};

export default function DashboardPage() {
  const { data, error, loading, reload } = useApiQuery(["admin", "dashboard"], () =>
    dashboardService.summary(),
  );

  if (loading && !data) return <LoadingState label="Memuat ringkasan..." />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  const totals = data.totals;
  // BC-12: `pending_revalidation` tidak tampil di UI.
  const cards = [
    { label: "Total Pesan Kontak", value: totals.inquiries, hint: "Tersimpan" },
    { label: "Prospek WhatsApp", value: totals.whatsapp_leads, hint: "Tersimpan" },
    { label: "Berita Tayang", value: totals.published_news, hint: "Sudah tayang" },
    { label: "Portofolio Aktif", value: totals.active_portfolios, hint: "Sudah tayang" },
    {
      label: "Media Siap Pakai",
      value: totals.completed_media,
      hint: totals.failed_media > 0 ? `${totals.failed_media} perlu dicek` : "Semua baik",
    },
    {
      label: "Email Massal Menunggu",
      value: totals.pending_email_campaigns,
      hint: `${totals.email_campaigns} pengiriman`,
    },
  ];

  return (
    <>
      <Seo
        title="Ringkasan"
        description="Ringkasan aktivitas website Indobraga."
        path="/admin"
        noindex
      />
      <PageTitle
        title="Selamat datang kembali"
        desc="Ringkasan aktivitas website Indobraga hari ini."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label}>
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-3xl font-bold">{card.value.toLocaleString("id-ID")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
          </Card>
        ))}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Pesan Kontak Terbaru</h2>
            <Link
              to={ROUTE_PATHS.adminInquiries}
              className="text-sm font-medium text-primary hover:underline"
            >
              Lihat semua
            </Link>
          </div>
          {data.latest_inquiries.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Belum ada pesan kontak.
            </p>
          ) : (
            <ul className="space-y-3">
              {data.latest_inquiries.slice(0, 5).map((inquiry) => (
                <li key={inquiry.id} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                    {(inquiry.name[0] ?? "?").toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{inquiry.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {inquiry.company ?? inquiry.email}
                    </span>
                  </span>
                  <Badge tone={inquiryStatusTone(inquiry.status)}>
                    {INQUIRY_STATUS_LABEL[inquiry.status] ?? inquiry.status}
                  </Badge>
                  {inquiry.created_at ? (
                    <span className="hidden text-xs text-muted-foreground sm:block">
                      {formatDateId(inquiry.created_at, "short")}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Email Massal Terbaru</h2>
            <Link
              to={ROUTE_PATHS.adminEmailHistory}
              className="text-sm font-medium text-primary hover:underline"
            >
              Lihat semua
            </Link>
          </div>
          {data.latest_email_campaigns.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Belum ada kampanye email.
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {data.latest_email_campaigns.slice(0, 8).map((campaign) => (
                <li key={campaign.id} className="rounded-xl border p-3">
                  <p className="truncate text-sm font-medium">{campaign.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {(campaign.sent_count ?? 0).toLocaleString("id-ID")}/
                    {(campaign.total_recipients ?? 0).toLocaleString("id-ID")} terkirim
                  </p>
                  <Badge tone={campaignStatusTone(campaign.status)} className="mt-2">
                    {CAMPAIGN_STATUS_LABEL[campaign.status] ?? campaign.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
