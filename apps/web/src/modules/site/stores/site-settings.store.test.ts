import { describe, expect, it } from "vitest";
import { useSiteSettingsStore } from "@/modules/site/stores/site-settings.store";
import { fallbackSettings } from "@/modules/site/lib/fallbacks";

function reset() {
  useSiteSettingsStore.setState({ settings: fallbackSettings, loaded: false, loading: false });
}

describe("site-settings.store", () => {
  it("hydrate sekali dari bootstrap (BC-23)", () => {
    reset();
    const store = useSiteSettingsStore.getState();
    store.hydrateFromBootstrap({ brand: "Boot", show_brand_text: true });
    expect(useSiteSettingsStore.getState().settings.brand).toBe("Boot");
    expect(useSiteSettingsStore.getState().loaded).toBe(true);
    // Hydrate kedua diabaikan.
    store.hydrateFromBootstrap({ brand: "Lain" });
    expect(useSiteSettingsStore.getState().settings.brand).toBe("Boot");
    store.hydrateFromBootstrap(null);
    expect(useSiteSettingsStore.getState().settings.brand).toBe("Boot");
  });

  it("gabung seo + abaikan key asing", () => {
    reset();
    useSiteSettingsStore.getState().hydrateFromBootstrap({
      seo: { title: "Judul Boot", description: null },
      tak_dikenal: "x",
    } as never);
    const settings = useSiteSettingsStore.getState().settings;
    expect(settings.seo?.title).toBe("Judul Boot");
    expect(settings.seo?.description).toBeNull();
    expect(settings).not.toHaveProperty("tak_dikenal");
  });

  it("setFromApi + setLoading", () => {
    reset();
    useSiteSettingsStore.getState().setLoading(true);
    expect(useSiteSettingsStore.getState().loading).toBe(true);
    useSiteSettingsStore.getState().setFromApi({ ...fallbackSettings, brand: "API" });
    const state = useSiteSettingsStore.getState();
    expect(state.settings.brand).toBe("API");
    expect(state.loaded).toBe(true);
    expect(state.loading).toBe(false);
    reset();
  });
});
