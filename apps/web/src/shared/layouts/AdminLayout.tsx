import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Menu, Search, X } from "lucide-react";
import { toast } from "sonner";
import { ADMIN_MENU } from "@/app/routes/admin-menu";
import { useAuthStore } from "@/modules/auth";
import { useUiStore } from "@/shared/stores/ui.store";
import { NotificationBell } from "@/modules/notifications";
import { BrandLogo } from "@/modules/site";
import { Seo } from "@/modules/site";
import { cn } from "@/shared/lib/cn";
import { ROUTE_PATHS } from "@/app/routes/route-paths";

function SidebarContent({ onNavigate }: { onNavigate: () => void }) {
  const location = useLocation();
  const menuQuery = useUiStore((state) => state.menuQuery);
  const query = menuQuery.trim().toLowerCase();

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-4">
      {ADMIN_MENU.map((group) => {
        const links = group.links.filter(
          (link) => query === "" || link.label.toLowerCase().includes(query),
        );
        if (links.length === 0) return null;
        return (
          <nav key={group.label} aria-label={group.label}>
            <p className="px-3 text-[11px] font-semibold uppercase tracking-widest text-white/50">
              {group.label}
            </p>
            <ul className="mt-2 space-y-1">
              {links.map((link) => {
                const active = link.exact
                  ? location.pathname === link.to
                  : location.pathname === link.to || location.pathname.startsWith(`${link.to}/`);
                return (
                  <li key={link.to}>
                    <NavLink
                      to={link.to}
                      end={link.exact}
                      onClick={onNavigate}
                      className={cn(
                        "block rounded-lg px-3 py-2 text-sm transition",
                        active
                          ? "bg-sidebar-primary font-semibold text-sidebar-primary-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent",
                      )}
                    >
                      {link.label}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </nav>
        );
      })}
      {query !== "" &&
      ADMIN_MENU.every((group) =>
        group.links.every((link) => !link.label.toLowerCase().includes(query)),
      ) ? (
        <p className="px-3 text-sm text-white/60">Tidak ada menu yang cocok.</p>
      ) : null}
    </div>
  );
}

export function AdminLayout() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const logout = useAuthStore((state) => state.logout);
  const sidebarOpen = useUiStore((state) => state.sidebarOpen);
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);
  const menuQuery = useUiStore((state) => state.menuQuery);
  const setMenuQuery = useUiStore((state) => state.setMenuQuery);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    // Guard ganda di sisi client (loader `requireAuth` sudah memastikan sesi).
    if (status === "anonymous") {
      navigate(ROUTE_PATHS.login, { replace: true });
    }
  }, [status, navigate]);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
      toast.success("Anda sudah keluar");
    } catch {
      toast.error("Keluar dari dashboard gagal, Anda akan diarahkan ke halaman masuk.");
    } finally {
      navigate(ROUTE_PATHS.login, { replace: true });
      setLoggingOut(false);
    }
  }

  if (status !== "authenticated" || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Memeriksa akses dashboard...
      </div>
    );
  }

  const initials = user.name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0] ?? "")
    .join("")
    .toUpperCase();

  return (
    <>
      <Seo title="Admin" description="Panel pengelolaan website Indobraga." path="/admin" noindex />
      <div className="flex min-h-screen bg-muted/40">
        {/* Sidebar desktop */}
        <aside className="hidden w-72 shrink-0 bg-sidebar lg:block" aria-label="Menu admin">
          <div className="sticky top-0 flex h-screen flex-col">
            <div className="p-4">
              <BrandLogo brand="Indobraga" textClassName="text-white" />
            </div>
            <div className="flex-1 overflow-hidden">
              <SidebarContent onNavigate={() => undefined} />
            </div>
            <div className="border-t border-sidebar-border p-4">
              <button
                type="button"
                onClick={() => void handleLogout()}
                disabled={loggingOut}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent disabled:opacity-50"
              >
                <LogOut className="h-4 w-4" /> {loggingOut ? "Keluar..." : "Keluar"}
              </button>
            </div>
          </div>
        </aside>

        {/* Drawer mobile */}
        {sidebarOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
            <aside
              className="absolute left-0 top-0 h-full w-72 bg-sidebar"
              aria-label="Menu admin seluler"
            >
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between p-4">
                  <BrandLogo brand="Indobraga" textClassName="text-white" />
                  <button
                    type="button"
                    aria-label="Tutup menu"
                    onClick={() => setSidebarOpen(false)}
                    className="rounded-full p-2 text-white hover:bg-sidebar-accent"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <SidebarContent onNavigate={() => setSidebarOpen(false)} />
                </div>
                <div className="border-t border-sidebar-border p-4">
                  <button
                    type="button"
                    onClick={() => void handleLogout()}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
                  >
                    <LogOut className="h-4 w-4" /> Keluar
                  </button>
                </div>
              </div>
            </aside>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background px-4">
            <button
              type="button"
              aria-label="Buka menu"
              onClick={() => setSidebarOpen(true)}
              className="rounded-full p-2 hover:bg-muted lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="relative hidden flex-1 sm:block">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                type="search"
                role="searchbox"
                aria-label="Cari menu admin"
                placeholder="Cari menu..."
                value={menuQuery}
                onChange={(event) => setMenuQuery(event.target.value)}
                className="w-full max-w-md rounded-full border border-input bg-background py-2 pl-10 pr-4 text-sm"
              />
            </div>
            <div className="ml-auto flex items-center gap-1">
              <NotificationBell />
              <Link
                to={ROUTE_PATHS.adminUsers}
                className="flex items-center gap-2 rounded-full px-2 py-1 hover:bg-muted"
                aria-label={`Profil ${user.name}`}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {initials}
                </span>
                <span className="hidden text-left md:block">
                  <span className="block max-w-32 truncate text-sm font-medium">{user.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {user.role === "super_admin" ? "Admin Utama" : "Editor Konten"}
                  </span>
                </span>
              </Link>
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </>
  );
}
