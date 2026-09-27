import { create } from "zustand";
import { authService } from "@/modules/auth/services/auth.service";
import { registerUnauthorizedHandler } from "@/shared/services/http-client";
import type { ContractSchemas } from "@/shared/types/contract";

export type AuthStatus = "unknown" | "authenticated" | "anonymous";
type AuthUser = ContractSchemas["AuthUser"];
type Permission = ContractSchemas["Permission"];

interface AuthState {
  user: AuthUser | null;
  status: AuthStatus;
  ensurePromise: Promise<AuthUser | null> | null;
  ensure: () => Promise<AuthUser | null>;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  reset: () => void;
  hasPermission: (permission: Permission) => boolean;
}

function redirectToLogin(redirect: string) {
  if (typeof window !== "undefined") {
    window.location.href = `/login?redirect=${encodeURIComponent(redirect)}`;
  }
}

/**
 * Sesi auth — data `me` diambil sekali per sesi aplikasi, bukan per halaman
 * (BC-26; dedupe in-flight via `ensurePromise`).
 */
export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  status: "unknown",
  ensurePromise: null,
  ensure: () => {
    const { status, user, ensurePromise } = get();
    if (status === "authenticated" && user) return Promise.resolve(user);
    if (status === "anonymous") return Promise.resolve(null);
    if (ensurePromise) return ensurePromise;
    const promise = authService
      .me()
      .then((me) => {
        set({ user: me, status: "authenticated", ensurePromise: null });
        return me;
      })
      .catch(() => {
        set({ user: null, status: "anonymous", ensurePromise: null });
        return null;
      });
    set({ ensurePromise: promise });
    return promise;
  },
  login: async (email, password) => {
    const user = await authService.login({ email, password });
    set({ user, status: "authenticated", ensurePromise: null });
    return user;
  },
  logout: async () => {
    try {
      await authService.logout();
    } finally {
      get().reset();
    }
  },
  reset: () => set({ user: null, status: "anonymous", ensurePromise: null }),
  hasPermission: (permission) => {
    const { user } = get();
    if (!user) return false;
    if (user.role === "super_admin") return true;
    return user.permissions.includes(permission);
  },
}));

// 401 pada request admin → reset sesi + redirect `/login?redirect=<path>` (kecuali cek sesi awal).
registerUnauthorizedHandler((redirect) => {
  useAuthStore.getState().reset();
  redirectToLogin(redirect);
});
