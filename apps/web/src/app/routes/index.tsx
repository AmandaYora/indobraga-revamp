import { createBrowserRouter } from "react-router-dom";
import { publicRoutes } from "@/app/routes/public.routes";
import { protectedRoutes } from "@/app/routes/protected.routes";

export const router = createBrowserRouter([...publicRoutes, ...protectedRoutes]);
