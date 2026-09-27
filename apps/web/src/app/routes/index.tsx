import { Outlet, ScrollRestoration, createBrowserRouter } from "react-router-dom";
import { publicRoutes } from "@/app/routes/public.routes";
import { loginRoute, protectedRoutes } from "@/app/routes/protected.routes";
import { RouteError } from "@/shared/components/feedback/RouteError";

function Root() {
  return (
    <>
      <ScrollRestoration />
      <Outlet />
    </>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    errorElement: <RouteError />,
    children: [
      ...publicRoutes,
      loginRoute,
      ...protectedRoutes,
      {
        path: "*",
        lazy: async () => {
          const { default: Component } = await import("@/modules/site/pages/NotFoundPage");
          return { Component };
        },
      },
    ],
  },
]);
