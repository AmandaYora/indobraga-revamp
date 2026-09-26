import { lazy } from "react";
import { ROUTE_PATHS } from "@/app/routes/route-paths";

const DashboardPage = lazy(() => import("@/modules/dashboard/pages/DashboardPage"));

export const protectedRoutes = [
  { path: ROUTE_PATHS.dashboard, element: <DashboardPage /> },
];
