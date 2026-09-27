import type { RouteObject } from "react-router-dom";
import { AdminLayout } from "@/shared/layouts/AdminLayout";
import { RouteError } from "@/shared/components/feedback/RouteError";
import { requireAuth, redirectIfAuthenticated } from "@/app/routes/guards";

/** `/login` — redirect ke `/admin` atau `?redirect=` bila sudah login (BC-25). */
export const loginRoute: RouteObject = {
  path: "login",
  loader: redirectIfAuthenticated,
  errorElement: <RouteError />,
  lazy: async () => {
    const { default: Component } = await import("@/modules/auth/pages/LoginPage");
    return { Component };
  },
};

/** `/admin/*` (18 halaman) di bawah loader guard `requireAuth`. */
export const protectedRoutes: RouteObject[] = [
  {
    path: "admin",
    loader: requireAuth,
    element: <AdminLayout />,
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        errorElement: <RouteError />,
        lazy: async () => {
          const { default: Component } = await import("@/modules/dashboard/pages/DashboardPage");
          return { Component };
        },
      },
      {
        path: "hero",
        errorElement: <RouteError />,
        lazy: async () => {
          const { default: Component } =
            await import("@/modules/profile/pages/admin/HeroAdminPage");
          return { Component };
        },
      },
      {
        path: "partners",
        errorElement: <RouteError />,
        lazy: async () => {
          const { default: Component } =
            await import("@/modules/profile/pages/admin/PartnersAdminPage");
          return { Component };
        },
      },
      {
        path: "strength",
        errorElement: <RouteError />,
        lazy: async () => {
          const { default: Component } =
            await import("@/modules/profile/pages/admin/StrengthAdminPage");
          return { Component };
        },
      },
      {
        path: "portfolio",
        errorElement: <RouteError />,
        lazy: async () => {
          const { default: Component } =
            await import("@/modules/portfolio/pages/admin/PortfolioAdminPage");
          return { Component };
        },
      },
      {
        path: "portfolio-categories",
        errorElement: <RouteError />,
        lazy: async () => {
          const { default: Component } =
            await import("@/modules/portfolio/pages/admin/PortfolioCategoriesAdminPage");
          return { Component };
        },
      },
      {
        path: "machines",
        errorElement: <RouteError />,
        lazy: async () => {
          const { default: Component } =
            await import("@/modules/profile/pages/admin/MachinesAdminPage");
          return { Component };
        },
      },
      {
        path: "services",
        errorElement: <RouteError />,
        lazy: async () => {
          const { default: Component } =
            await import("@/modules/profile/pages/admin/ServicesAdminPage");
          return { Component };
        },
      },
      {
        path: "gallery",
        errorElement: <RouteError />,
        lazy: async () => {
          const { default: Component } =
            await import("@/modules/gallery/pages/admin/GalleryAdminPage");
          return { Component };
        },
      },
      {
        path: "news",
        errorElement: <RouteError />,
        lazy: async () => {
          const { default: Component } = await import("@/modules/news/pages/admin/NewsAdminPage");
          return { Component };
        },
      },
      {
        path: "inquiries",
        errorElement: <RouteError />,
        lazy: async () => {
          const { default: Component } =
            await import("@/modules/leads/pages/admin/InquiriesAdminPage");
          return { Component };
        },
      },
      {
        path: "whatsapp",
        errorElement: <RouteError />,
        lazy: async () => {
          const { default: Component } =
            await import("@/modules/leads/pages/admin/WhatsappAdminPage");
          return { Component };
        },
      },
      {
        path: "email-accounts",
        errorElement: <RouteError />,
        lazy: async () => {
          const { default: Component } = await import("@/modules/email/pages/EmailAccountsPage");
          return { Component };
        },
      },
      {
        path: "email-blast",
        errorElement: <RouteError />,
        lazy: async () => {
          const { default: Component } = await import("@/modules/email/pages/EmailBlastPage");
          return { Component };
        },
      },
      {
        path: "email-templates",
        errorElement: <RouteError />,
        lazy: async () => {
          const { default: Component } = await import("@/modules/email/pages/EmailTemplatesPage");
          return { Component };
        },
      },
      {
        path: "email-history",
        errorElement: <RouteError />,
        lazy: async () => {
          const { default: Component } = await import("@/modules/email/pages/EmailHistoryPage");
          return { Component };
        },
      },
      {
        path: "settings",
        errorElement: <RouteError />,
        lazy: async () => {
          const { default: Component } = await import("@/modules/site/pages/admin/SettingsPage");
          return { Component };
        },
      },
      {
        path: "users",
        errorElement: <RouteError />,
        lazy: async () => {
          const { default: Component } = await import("@/modules/users/pages/UsersPage");
          return { Component };
        },
      },
    ],
  },
];
