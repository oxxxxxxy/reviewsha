import { create } from 'zustand';
import { createUuid } from '../utils/uuid';

type Theme = 'light' | 'dark' | 'system';
export type ToastItem = { id: string; message: string };

type UiState = {
  isSidebarOpen: boolean;
  theme: Theme;
  isGlobalLoading: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  setTheme: (theme: Theme) => void;
  setGlobalLoading: (isLoading: boolean) => void;
  toasts: ToastItem[];
  pushToast: (message: string) => void;
  removeToast: (id: string) => void;
};

export const useUiStore = create<UiState>((set) => ({
  isSidebarOpen: true,
  theme: 'system',
  isGlobalLoading: false,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
  setTheme: (theme) => set({ theme }),
  setGlobalLoading: (isGlobalLoading) => set({ isGlobalLoading }),
  toasts: [],
  pushToast: (message) =>
    set((state) => ({ toasts: [...state.toasts, { id: createUuid(), message }] })),
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));
