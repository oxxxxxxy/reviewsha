import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'system';

type UiState = {
  isSidebarOpen: boolean;
  theme: Theme;
  isGlobalLoading: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  setTheme: (theme: Theme) => void;
  setGlobalLoading: (isLoading: boolean) => void;
};

export const useUiStore = create<UiState>((set) => ({
  isSidebarOpen: true,
  theme: 'system',
  isGlobalLoading: false,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
  setTheme: (theme) => set({ theme }),
  setGlobalLoading: (isGlobalLoading) => set({ isGlobalLoading }),
}));
