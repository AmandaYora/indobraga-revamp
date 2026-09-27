import { create } from "zustand";

interface UiState {
  sidebarOpen: boolean;
  menuQuery: string;
  setSidebarOpen: (open: boolean) => void;
  setMenuQuery: (query: string) => void;
}

/** State UI global: drawer sidebar + query pencarian menu (BC-27). */
export const useUiStore = create<UiState>()((set) => ({
  sidebarOpen: false,
  menuQuery: "",
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setMenuQuery: (query) => set({ menuQuery: query }),
}));
