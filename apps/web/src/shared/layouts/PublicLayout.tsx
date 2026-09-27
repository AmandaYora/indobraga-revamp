import { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
// Import langsung dari file komponen/service (bukan barrel modul yang ikut mengekspor kode admin)
// agar JS awal halaman publik tidak memuat kode admin.
import { SiteHeader } from "@/modules/site/components/SiteHeader";
import { SiteFooter } from "@/modules/site/components/SiteFooter";
import { PublicPending } from "@/modules/site/components/PublicPending";
import { usePublicPending } from "@/modules/site/hooks/use-public-pending";
import { WhatsAppFab } from "@/modules/leads/components/WhatsAppFab";
import { siteService } from "@/modules/site/services/site.service";
import { useSiteSettingsStore } from "@/modules/site/stores/site-settings.store";
import { readBootstrap } from "@/shared/services/bootstrap";
import type { ContractSchemas } from "@/shared/types/contract";

function isPublicSiteSettings(
  value: unknown,
): value is Partial<ContractSchemas["PublicSiteSettings"]> {
  return typeof value === "object" && value !== null;
}

/** Port `components/public/PublicLayout.tsx` legacy + pending UI per route. */
export function PublicLayout() {
  const location = useLocation();
  const hydrateFromBootstrap = useSiteSettingsStore((state) => state.hydrateFromBootstrap);
  const setFromApi = useSiteSettingsStore((state) => state.setFromApi);
  const setLoading = useSiteSettingsStore((state) => state.setLoading);
  const fetched = useRef(false);
  const pendingRoute = usePublicPending();

  useEffect(() => {
    // Hidrasi utama dari bootstrap terjadi di main.tsx sebelum render (BC-23); di sini hanya
    // jaring pengaman untuk navigasi client dan fetch sekali ke API untuk data terbaru.
    const bootstrap = readBootstrap(location.pathname);
    if (bootstrap && isPublicSiteSettings(bootstrap.site_settings)) {
      hydrateFromBootstrap(bootstrap.site_settings);
    }
    if (fetched.current) return;
    fetched.current = true;
    setLoading(true);
    siteService
      .siteSettings()
      .then((settings) => setFromApi(settings))
      .catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        {pendingRoute ? <PublicPending route={pendingRoute} /> : null}
        {/* Halaman lama tetap ter-mount (state terjaga) tetapi disembunyikan selama skeleton tampil. */}
        <div className={pendingRoute ? "hidden" : "contents"}>
          <Outlet />
        </div>
      </main>
      <SiteFooter />
      <WhatsAppFab />
    </div>
  );
}
