import { Link } from "react-router-dom";
import { Factory, Inbox, MessageCircle, Newspaper, Package, Printer } from "lucide-react";
import { ErrorState, LoadingState } from "@/shared/components/feedback/states";
import { PageTitle } from "@/shared/components/ui/page-title";
import { Card } from "@/shared/components/ui/card";
import { Seo } from "@/modules/site";
import { StatusBadge, leadStatus } from "@/modules/content";
import { useApiQuery } from "@/shared/hooks/useApiQuery";
import { dashboardService } from "@/modules/dashboard/services/dashboard.service";
import { formatDateId } from "@/shared/lib/date";
import { ROUTE_PATHS } from "@/app/routes/route-paths";

/** Port 1:1 `routes/admin.index.tsx` legacy. */
export default function DashboardPage() {
  const { data, error, loading, reload } = useApiQuery(["admin", "dashboard"], () =>
    dashboardService.summary(),
  );
  const totals = data?.totals;
  // BC-12: `pending_revalidation` tidak tampil di UI.
  const stats = [
    {
      label: "Total Pesan Kontak",
      value: String(totals?.inquiries ?? 0),
      change: "Tersimpan",
      icon: Inbox,
      color: "bg-primary/10 text-primary",
    },
    {
      label: "Prospek WhatsApp",
      value: String(totals?.whatsapp_leads ?? 0),
      change: "Tersimpan",
      icon: MessageCircle,
      color: "bg-success/15 text-success",
    },
    {
      label: "Berita Tayang",
      value: String(totals?.published_news ?? 0),
      change: "Sudah tayang",
      icon: Newspaper,
      color: "bg-accent/20 text-accent-foreground",
    },
    {
      label: "Portofolio Aktif",
      value: String(totals?.active_portfolios ?? 0),
      change: "Sudah tayang",
      icon: Package,
      color: "bg-warning/20 text-warning-strong",
    },
    {
      label: "Media Siap Pakai",
      value: String(totals?.completed_media ?? 0),
      change: `${totals?.failed_media ?? 0} perlu dicek`,
      icon: Factory,
      color: "bg-primary-soft text-primary",
    },
    {
      label: "Email Massal Menunggu",
      value: String(totals?.pending_email_campaigns ?? 0),
      change: `${totals?.email_campaigns ?? 0} pengiriman`,
      icon: Printer,
      color: "bg-success/15 text-success",
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
      {loading && !data && <LoadingState label="Memuat ringkasan..." />}
      {error && <ErrorState error={error} onRetry={reload} />}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="mt-2 font-display text-3xl font-extrabold text-primary-deep">
                    {s.value}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-success">{s.change}</p>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${s.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">Pesan Kontak Terbaru</h3>
            <Link className="text-xs font-semibold text-primary" to={ROUTE_PATHS.adminInquiries}>
              Lihat semua
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {(data?.latest_inquiries ?? []).map((i) => (
              <li key={i.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                    {i.name
                      .split(" ")
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((s) => s[0])
                      .join("")}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{i.name}</p>
                    <p className="text-xs text-muted-foreground">{i.company ?? i.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge display={leadStatus(i.status)} />
                  <span className="hidden text-xs text-muted-foreground sm:block">
                    {formatDateId(i.created_at, "short")}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h3 className="mb-4 font-display text-lg font-bold">Email Massal Terbaru</h3>
          <div className="grid grid-cols-2 gap-2">
            {(data?.latest_email_campaigns ?? []).slice(0, 8).map((campaign) => (
              <div key={campaign.id} className="rounded-xl bg-secondary px-3 py-2 text-center">
                <p className="truncate text-xs font-bold text-primary-deep">{campaign.title}</p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {campaign.sent_count}/{campaign.total_recipients} terkirim
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
