import { describe, expect, it } from "vitest";
import {
  fallbackFacilities,
  fallbackGalleryList,
  fallbackHome,
  fallbackNewsDetail,
  fallbackNewsPage,
  fallbackPortfolioCategories,
  fallbackPortfolioList,
  fallbackSettings,
} from "@/modules/site/lib/fallbacks";
import {
  emptySettingsForm,
  settingsFromApi,
  toSettingsUpdatePayload,
} from "@/modules/site/lib/settings-form";

describe("fallbacks", () => {
  it("settings default: logo & WA siap paint pertama (BC-23)", () => {
    expect(fallbackSettings.brand).toBe("Indobraga");
    expect(fallbackSettings.whatsapp).toBe("6285158700895");
    expect(fallbackSettings.show_brand_text).toBe(false);
  });

  it("home & fasilitas berbentuk kontrak v1", () => {
    expect(fallbackHome.hero.slides).toHaveLength(2);
    expect(fallbackHome.featured_portfolios.length).toBeLessThanOrEqual(6);
    expect(fallbackHome.latest_news.length).toBeLessThanOrEqual(3);
    expect(fallbackFacilities.production_capacities.length).toBeGreaterThan(0);
  });

  it("portofolio: filter kategori + cursor", () => {
    const all = fallbackPortfolioList(undefined, 24);
    expect(all.next_cursor).toBeNull();
    const jersey = fallbackPortfolioList("Jersey", 24);
    expect(jersey.items.length).toBeGreaterThan(0);
    expect(jersey.items.every((item) => item.category === "Jersey")).toBe(true);
    expect(fallbackPortfolioCategories().items.length).toBeGreaterThan(0);
  });

  it("galeri: 9 item, item ke-6 video", () => {
    const gallery = fallbackGalleryList(24);
    expect(gallery.items).toHaveLength(9);
    expect(gallery.items[5].type).toBe("video");
  });

  it("berita: pagination + detail + null untuk slug asing (BC-22)", () => {
    const page = fallbackNewsPage(99, 6);
    expect(page.pagination.page).toBeLessThanOrEqual(page.pagination.total_pages);
    expect(fallbackNewsDetail("atexco-model-x-plus")?.slug).toBe("atexco-model-x-plus");
    expect(fallbackNewsDetail("tidak-ada")).toBeNull();
  });
});

describe("settings-form", () => {
  it("hanya id media number yang dikirim", () => {
    const form = {
      ...emptySettingsForm(),
      brand: "X",
      logo_media_file_id: 7,
      og_media_file_id: undefined,
    };
    const payload = toSettingsUpdatePayload(form);
    expect(payload.logo_media_file_id).toBe(7);
    expect(payload).not.toHaveProperty("og_media_file_id");
    expect(payload.show_brand_text).toBe(false);
  });

  it("form renggang dinormalisasi", () => {
    const payload = toSettingsUpdatePayload({
      show_brand_text: false,
      logo_media_file_id: "tujuh",
    } as never);
    expect(payload.brand).toBe("");
    expect(payload).not.toHaveProperty("logo_media_file_id");
  });

  it("settingsFromApi memetakan field teks + id media", () => {
    const form = settingsFromApi({
      id: 1,
      brand: "B",
      show_brand_text: true,
      logo_media_file_id: 3,
      footer_logo_media_file_id: 4,
      og_media_file_id: 5,
      contact_hero_media_file_id: 6,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    });
    expect(form.brand).toBe("B");
    expect(form.show_brand_text).toBe(true);
    expect(form.logo_media_file_id).toBe(3);
    expect(form.footer_logo_media_file_id).toBe(4);
    expect(form.og_media_file_id).toBe(5);
    expect(form.contact_hero_media_file_id).toBe(6);

    const payload = toSettingsUpdatePayload(form);
    expect(payload.footer_logo_media_file_id).toBe(4);
    expect(payload.og_media_file_id).toBe(5);
    expect(payload.contact_hero_media_file_id).toBe(6);
  });
});
