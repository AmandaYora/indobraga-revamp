import { useEffect, useRef } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Image as ImageIcon,
  Images,
  Users,
  Package,
  Wrench,
  Newspaper,
  Briefcase,
  Inbox,
  MessageCircle,
  Mail,
  Send,
  FileText,
  History,
  Settings,
  UserCog,
  LogOut,
  Menu,
  X,
  Search,
  Tags,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { ADMIN_MENU } from "@/app/routes/admin-menu";
import { ROUTE_PATHS } from "@/app/routes/route-paths";
import { useAuthStore } from "@/modules/auth";
import { NotificationBell } from "@/modules/notifications";
import { Seo } from "@/modules/site";
import { LoadingState } from "@/shared/components/feedback/states";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { useUiStore } from "@/shared/stores/ui.store";

/*
 * Port `components/admin/AdminLayout.tsx` legacy — markup & kelas 1:1.
 * Satu-satunya perubahan: input pencarian top bar memfilter link sidebar (BC-27).
 */

/** Ikon per link sidebar (sama dengan `groups` legacy). */
const MENU_ICONS: Record<string, LucideIcon> = {
  [ROUTE_PATHS.admin]: LayoutDashboard,
  [ROUTE_PATHS.adminHero]: ImageIcon,
  [ROUTE_PATHS.adminPartners]: Users,
  [ROUTE_PATHS.adminStrength]: Wrench,
  [ROUTE_PATHS.adminPortfolio]: Package,
  [ROUTE_PATHS.adminPortfolioCategories]: Tags,
  [ROUTE_PATHS.adminMachines]: Wrench,
  [ROUTE_PATHS.adminServices]: Briefcase,
  [ROUTE_PATHS.adminGallery]: Images,
  [ROUTE_PATHS.adminNews]: Newspaper,
  [ROUTE_PATHS.adminInquiries]: Inbox,
  [ROUTE_PATHS.adminWhatsapp]: MessageCircle,
  [ROUTE_PATHS.adminEmailAccounts]: Mail,
  [ROUTE_PATHS.adminEmailBlast]: Send,
  [ROUTE_PATHS.adminEmailTemplates]: FileText,
  [ROUTE_PATHS.adminEmailHistory]: History,
  [ROUTE_PATHS.adminSettings]: Settings,
  [ROUTE_PATHS.adminUsers]: UserCog,
};

function isActiveRoute(pathname: string, target: string, exact?: boolean): boolean {
  if (exact) {
    return pathname === target;
  }

  return pathname === target || pathname.startsWith(`${target}/`);
}

/** Markup `BrandLogo` legacy dengan props yang dipakai sidebar admin legacy (tanpa `logoUrl`). */
function AdminBrand() {
  return (
    <span className="flex min-w-0 items-center gap-2 ">
      <span
        className="flex shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-extrabold text-primary-foreground ring-1 ring-primary/20 h-8 w-8 bg-white text-primary-deep"
        aria-hidden="true"
      >
        AI
      </span>
      <span className="truncate font-display text-base font-bold">Admin Indobraga</span>
    </span>
  );
}

export function AdminLayout() {
  const open = useUiStore((state) => state.sidebarOpen);
  const setOpen = useUiStore((state) => state.setSidebarOpen);
  const menuQuery = useUiStore((state) => state.menuQuery);
  const setMenuQuery = useUiStore((state) => state.setMenuQuery);
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const logoutSession = useAuthStore((state) => state.logout);
  const loggingOut = useRef(false);
  const loc = useLocation();
  const nav = useNavigate();

  useEffect(() => {
    // Guard ganda di sisi client (loader `requireAuth` sudah memastikan sesi).
    if (status === "anonymous") {
      nav(ROUTE_PATHS.login, { replace: true });
    }
  }, [status, nav]);

  const logout = async () => {
    if (loggingOut.current) return;
    loggingOut.current = true;
    try {
      await logoutSession();
      toast.success("Anda sudah keluar");
    } catch {
      toast.error("Keluar dari dashboard gagal, Anda akan diarahkan ke halaman masuk.");
    } finally {
      loggingOut.current = false;
      nav(ROUTE_PATHS.login, { replace: true });
    }
  };

  if (status === "unknown") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
        <div className="w-full max-w-md">
          <LoadingState label="Memeriksa akses dashboard..." />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // BC-27: pencarian top bar memfilter link sidebar.
  const query = menuQuery.trim().toLowerCase();
  const groups = ADMIN_MENU.map((group) => ({
    ...group,
    links: group.links.filter((link) => query === "" || link.label.toLowerCase().includes(query)),
  })).filter((group) => group.links.length > 0);

  return (
    <>
      <Seo title="Admin" description="Panel pengelolaan website Indobraga." path="/admin" noindex />
      <div className="flex min-h-screen bg-secondary">
        {/* Mobile overlay */}
        {open && (
          <div
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
        )}
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col transform bg-sidebar text-sidebar-foreground transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border px-5">
            <Link to={ROUTE_PATHS.admin} className="flex items-center gap-2">
              <AdminBrand />
            </Link>
            <button
              type="button"
              className="lg:hidden"
              onClick={() => setOpen(false)}
              aria-label="Tutup menu navigasi"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <ScrollArea className="flex-1">
            <nav className="px-3 py-5">
              {groups.map((g) => (
                <div key={g.label} className="mb-5">
                  <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/50">
                    {g.label}
                  </p>
                  <ul className="space-y-0.5">
                    {g.links.map((it) => {
                      const Icon = MENU_ICONS[it.to] ?? LayoutDashboard;
                      const active = isActiveRoute(loc.pathname, it.to, it.exact);
                      return (
                        <li key={it.to}>
                          <Link
                            to={it.to}
                            onClick={() => setOpen(false)}
                            aria-current={active ? "page" : undefined}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${active ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-card" : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"}`}
                          >
                            <Icon className="h-4 w-4" />
                            {it.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
              {/* BC-27: state baru saat pencarian menu tidak menemukan link. */}
              {groups.length === 0 && (
                <p className="px-3 text-sm text-sidebar-foreground/50">
                  Tidak ada menu yang cocok.
                </p>
              )}
            </nav>
          </ScrollArea>
          <div className="mt-auto shrink-0 border-t border-sidebar-border p-4">
            <button
              type="button"
              onClick={() => void logout()}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent"
            >
              <LogOut className="h-4 w-4" /> Keluar
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1 lg:ml-0">
          {/* Topbar */}
          <header className="sticky top-0 z-30 flex h-16 min-w-0 items-center justify-between gap-4 border-b border-border bg-background px-4 sm:px-6">
            <button
              type="button"
              className="lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Buka menu navigasi"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden flex-1 max-w-md md:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  role="searchbox"
                  aria-label="Cari menu admin"
                  placeholder="Cari menu..."
                  value={menuQuery}
                  onChange={(event) => setMenuQuery(event.target.value)}
                  className="w-full rounded-full border border-border bg-secondary py-2 pl-10 pr-4 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>
            <div className="flex min-w-0 items-center gap-3">
              <NotificationBell />
              <div className="flex min-w-0 items-center gap-2 rounded-full bg-secondary px-3 py-1.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  AD
                </div>
                <div className="hidden text-xs sm:block">
                  <p className="font-semibold leading-tight">{user.name}</p>
                  <p className="text-muted-foreground">
                    {user.role === "super_admin" ? "Admin Utama" : "Editor Konten"}
                  </p>
                </div>
              </div>
            </div>
          </header>
          <main className="mx-auto w-full min-w-0 max-w-7xl p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </>
  );
}
