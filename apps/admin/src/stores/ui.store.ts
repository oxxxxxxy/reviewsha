import { create } from 'zustand';

export type AdminTheme = 'light' | 'dark' | 'system';

type AdminUiState = {
  isSidebarOpen: boolean;
  theme: AdminTheme;
  isGlobalLoading: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  setTheme: (theme: AdminTheme) => void;
  setGlobalLoading: (isLoading: boolean) => void;
  reset: () => void;
};

const initialState = {
  isSidebarOpen: true,
  theme: 'system' as AdminTheme,
  isGlobalLoading: false,
};

export const useAdminUiStore = create<AdminUiState>((set) => ({
  ...initialState,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
  setTheme: (theme) => set({ theme }),
  setGlobalLoading: (isGlobalLoading) => set({ isGlobalLoading }),
  reset: () => set(initialState),
}));
