import { create } from "zustand";
import { fallbackSettings } from "@/modules/site/lib/fallbacks";
import type { ContractSchemas } from "@/shared/types/contract";

type PublicSiteSettings = ContractSchemas["PublicSiteSettings"];

interface SiteSettingsState {
  settings: PublicSiteSettings;
  loaded: boolean;
  loading: boolean;
  hydrateFromBootstrap: (settings: Partial<PublicSiteSettings> | null) => void;
  setFromApi: (settings: PublicSiteSettings) => void;
  setLoading: (loading: boolean) => void;
}

/**
 * Pengaturan situs publik — hidrasi dari bootstrap saat paint pertama
 * (BC-23: tanpa lompatan logo), fetch sekali dari API sesudahnya.
 */
export const useSiteSettingsStore = create<SiteSettingsState>()((set) => ({
  settings: fallbackSettings,
  loaded: false,
  loading: false,
  hydrateFromBootstrap: (settings) =>
    set((state) => {
      if (state.loaded || !settings) return state;
      const merged: PublicSiteSettings = { ...state.settings };
      for (const [key, value] of Object.entries(settings)) {
        if (key === "seo" && value && typeof value === "object") {
          const incomingSeo = value as {
            title?: string | null;
            description?: string | null;
            og_image_url?: string | null;
          };
          const currentSeo = merged.seo ?? { title: null, description: null };
          merged.seo = {
            title: incomingSeo.title ?? currentSeo.title ?? null,
            description: incomingSeo.description ?? currentSeo.description ?? null,
            og_image_url: incomingSeo.og_image_url ?? currentSeo.og_image_url ?? null,
          };
        } else if (key in merged) {
          (merged as unknown as Record<string, unknown>)[key] = value;
        }
      }
      return { settings: merged, loaded: true };
    }),
  setFromApi: (settings) => set({ settings, loaded: true, loading: false }),
  setLoading: (loading) => set({ loading }),
}));
