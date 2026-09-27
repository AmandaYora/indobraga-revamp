import type { ContractSchemas } from "@/shared/types/contract";

type PublicPortfolioImage = ContractSchemas["PublicPortfolioImage"];
type PublicPortfolioItem = ContractSchemas["PublicPortfolioItem"];

/** URL terbaik satu gambar portofolio (paritas `imageSrc` di `PortfolioModal.tsx` legacy). */
export function portfolioImageSrc(image: PublicPortfolioImage): string | null {
  return image.large_url ?? image.medium_url ?? image.thumbnail_url ?? null;
}

/**
 * Daftar gambar carousel modal (paritas legacy): gambar galeri yang punya URL; bila kosong,
 * cover (`medium_url`/`thumbnail_url`) sebagai satu-satunya gambar.
 */
export function portfolioModalImages(item: PublicPortfolioItem | null): PublicPortfolioImage[] {
  if (!item) {
    return [];
  }
  const list = (item.images ?? []).filter((image) => Boolean(portfolioImageSrc(image)));
  if (list.length > 0) {
    return list;
  }
  if (item.medium_url ?? item.thumbnail_url) {
    return [
      {
        thumbnail_url: item.thumbnail_url,
        medium_url: item.medium_url,
        large_url: item.medium_url,
        alt_text: item.alt_text ?? item.title,
      },
    ];
  }
  return [];
}
