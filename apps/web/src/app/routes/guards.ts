import { redirect, type LoaderFunctionArgs } from "react-router-dom";
import { useAuthStore } from "@/modules/auth";
import { ROUTE_PATHS, loginPath } from "@/app/routes/route-paths";

/** Guard admin: `authStore.ensure()` sekali, dedupe in-flight (BC-26). */
export async function requireAuth({ request }: LoaderFunctionArgs) {
  const user = await useAuthStore.getState().ensure();
  if (!user) {
    const url = new URL(request.url);
    const redirectTo = `${url.pathname}${url.search}`;
    throw redirect(loginPath(redirectTo === ROUTE_PATHS.login ? undefined : redirectTo));
  }
  return null;
}

/** `/login` me-redirect user yang sudah login (BC-25). */
export async function redirectIfAuthenticated({ request }: LoaderFunctionArgs) {
  const user = await useAuthStore.getState().ensure();
  if (user) {
    const redirectTo = new URL(request.url).searchParams.get("redirect");
    throw redirect(redirectTo && redirectTo.startsWith("/") ? redirectTo : ROUTE_PATHS.admin);
  }
  return null;
}
