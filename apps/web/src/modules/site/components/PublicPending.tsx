import { useNavigation } from "react-router-dom";
import { DelayedFallback } from "@/shared/components/feedback/DelayedFallback";
import { HomePendingPage } from "@/modules/home";
import { FacilitiesContentSkeleton } from "@/modules/profile";
import { PortfolioGridSkeleton } from "@/modules/portfolio";
import { GalleryGridSkeleton } from "@/modules/gallery";
import { ArticleDetailSkeleton, NewsGridSkeleton } from "@/modules/news";

/**
 * Pending UI navigasi publik: skeleton per route (paritas `pendingComponent`
 * legacy) muncul hanya bila navigasi > 300 ms via `DelayedFallback`.
 */
export function PublicPending() {
  const navigation = useNavigation();
  const path = navigation.location?.pathname ?? "";
  let skeleton = <NewsGridSkeleton />;
  if (path === "/") skeleton = <HomePendingPage />;
  else if (path === "/portfolio") skeleton = <PortfolioGridSkeleton />;
  else if (path === "/fasilitas") skeleton = <FacilitiesContentSkeleton />;
  else if (path === "/galeri") skeleton = <GalleryGridSkeleton />;
  else if (path.startsWith("/berita/")) skeleton = <ArticleDetailSkeleton />;
  return (
    <DelayedFallback>
      <div className="absolute inset-0 bg-background">{skeleton}</div>
    </DelayedFallback>
  );
}
