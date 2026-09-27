import type { PendingRoute } from "@/modules/site/hooks/use-public-pending";
import { HomePendingPage } from "@/modules/home/components/HomeSkeletons";
import { PortfolioPendingPage } from "@/modules/portfolio/components/PortfolioSkeletons";
import { FacilitiesPendingPage } from "@/modules/profile/components/FacilitiesSkeletons";
import { GalleryPendingPage } from "@/modules/gallery/components/GallerySkeletons";
import { ArticleDetailSkeleton, NewsPendingPage } from "@/modules/news/components/NewsSkeletons";

/** `pendingComponent` per route publik (paritas legacy). */
export function PublicPending({ route }: { route: PendingRoute }) {
  switch (route) {
    case "home":
      return <HomePendingPage />;
    case "portfolio":
      return <PortfolioPendingPage />;
    case "facilities":
      return <FacilitiesPendingPage />;
    case "gallery":
      return <GalleryPendingPage />;
    case "news":
      return <NewsPendingPage />;
    case "news-detail":
      return <ArticleDetailSkeleton />;
  }
}
