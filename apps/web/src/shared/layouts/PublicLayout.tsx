import { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { SiteHeader } from "@/modules/site";
import { SiteFooter } from "@/modules/site";
import { PublicPending } from "@/modules/site";
import { WhatsAppFab } from "@/modules/leads";
import { readBootstrap } from "@/shared/services/bootstrap";
import { siteService } from "@/modules/site";
import { useSiteSettingsStore } from "@/modules/site";
import type { ContractSchemas } from "@/shared/types/contract";

function isPublicSiteSettings(
  value: unknown,
): value is Partial<ContractSchemas["PublicSiteSettings"]> {
  return typeof value === "object" && value !== null;
}

export function PublicLayout() {
  const location = useLocation();
  const hydrateFromBootstrap = useSiteSettingsStore((state) => state.hydrateFromBootstrap);
  const setFromApi = useSiteSettingsStore((state) => state.setFromApi);
  const setLoading = useSiteSettingsStore((state) => state.setLoading);
  const fetched = useRef(false);

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
      <main className="relative flex-1">
        <Outlet />
        <PublicPending />
      </main>
      <SiteFooter />
      <WhatsAppFab />
    </div>
  );
}
