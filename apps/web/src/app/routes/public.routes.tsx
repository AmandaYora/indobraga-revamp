import { lazy } from "react";
import { ROUTE_PATHS } from "@/app/routes/route-paths";

const LoginPage = lazy(() => import("@/modules/auth/pages/LoginPage"));

export const publicRoutes = [
  { path: ROUTE_PATHS.home, element: <LoginPage /> },
  { path: ROUTE_PATHS.login, element: <LoginPage /> },
];
