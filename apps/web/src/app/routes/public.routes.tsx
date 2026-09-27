import type { RouteObject } from "react-router-dom";
import { PublicLayout } from "@/shared/layouts/PublicLayout";
import { RouteError } from "@/shared/components/feedback/RouteError";
import {
  facilitiesLoader,
  galleryLoader,
  homeLoader,
  newsDetailLoader,
  newsListLoader,
  portfolioLoader,
} from "@/modules/site/services/public.loaders";

/**
 * Route publik di bawah `PublicLayout` — semua `lazy`, masing-masing punya
 * `loader` (bootstrap saat load pertama / API saat navigasi + SEO paralel).
 * Detail berita adalah route sibling, bukan nested (beda semantik loader
 * react-router vs TanStack legacy).
 */
export const publicRoutes: RouteObject[] = [
  {
    element: <PublicLayout />,
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        loader: homeLoader,
        errorElement: <RouteError />,
        lazy: async () => {
          const { default: Component } = await import("@/modules/home/pages/HomePage");
          return { Component };
        },
      },
      {
        path: "portfolio",
        loader: portfolioLoader,
        errorElement: <RouteError />,
        lazy: async () => {
          const { default: Component } = await import("@/modules/portfolio/pages/PortfolioPage");
          return { Component };
        },
      },
      {
        path: "fasilitas",
        loader: facilitiesLoader,
        errorElement: <RouteError />,
        lazy: async () => {
          const { default: Component } = await import("@/modules/profile/pages/FacilitiesPage");
          return { Component };
        },
      },
      {
        path: "galeri",
        loader: galleryLoader,
        errorElement: <RouteError />,
        lazy: async () => {
          const { default: Component } = await import("@/modules/gallery/pages/GalleryPage");
          return { Component };
        },
      },
      {
        path: "berita",
        loader: newsListLoader,
        errorElement: <RouteError />,
        lazy: async () => {
          const { default: Component } = await import("@/modules/news/pages/NewsListPage");
          return { Component };
        },
      },
      {
        path: "berita/:slug",
        loader: newsDetailLoader,
        errorElement: <RouteError />,
        lazy: async () => {
          const { default: Component } = await import("@/modules/news/pages/NewsDetailPage");
          return { Component };
        },
      },
      {
        path: "kontak",
        errorElement: <RouteError />,
        lazy: async () => {
          const { default: Component } = await import("@/modules/site/pages/ContactPage");
          return { Component };
        },
      },
    ],
  },
];
