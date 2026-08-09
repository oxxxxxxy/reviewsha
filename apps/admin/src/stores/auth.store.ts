import type { User } from '@reviewsha/types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { adminSdk } from '../api/client';

type AdminAuthState = {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  login(email: string, password: string): Promise<void>;
  restore(): Promise<void>;
  logout(): Promise<void>;
};

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set, get) => {
      const configureRefresh = () => {
        adminSdk.client.setRefreshTokenHandler(async () => {
          const refreshToken = get().refreshToken;
          if (!refreshToken) return null;
          try {
            const result = await adminSdk.auth.refresh(refreshToken);
            adminSdk.client.setAccessToken(result.accessToken);
            set({
              user: result.user,
              accessToken: result.accessToken,
              refreshToken: result.refreshToken,
            });
            return result.accessToken;
          } catch {
            await get().logout();
            return null;
          }
        });
      };
      return {
        user: null,
        accessToken: null,
        refreshToken: null,
        isLoading: false,
        async login(email, password) {
          configureRefresh();
          set({ isLoading: true });
          try {
            const result = await adminSdk.auth.login({ email, password });
            if (result.user.role !== 'ADMIN' && result.user.role !== 'SUPER_ADMIN') {
              throw new Error('ADMIN_REQUIRED');
            }
            adminSdk.client.setAccessToken(result.accessToken);
            set({
              user: result.user,
              accessToken: result.accessToken,
              refreshToken: result.refreshToken,
            });
          } finally {
            set({ isLoading: false });
          }
        },
        async restore() {
          configureRefresh();
          const token = get().accessToken;
          if (!token) return;
          adminSdk.client.setAccessToken(token);
          set({ isLoading: true });
          try {
            const user = await adminSdk.auth.me();
            if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')
              throw new Error('ADMIN_REQUIRED');
            set({ user });
          } catch {
            set({ user: null, accessToken: null, refreshToken: null });
            adminSdk.client.clearAccessToken();
          } finally {
            set({ isLoading: false });
          }
        },
        async logout() {
          const refreshToken = get().refreshToken;
          try {
            if (refreshToken) await adminSdk.auth.logout(refreshToken);
          } finally {
            adminSdk.client.clearAccessToken();
            adminSdk.client.setRefreshTokenHandler(undefined);
            set({ user: null, accessToken: null, refreshToken: null });
          }
        },
      };
    },
    {
      name: 'reviewsha-admin-auth',
      partialize: ({ user, accessToken, refreshToken }) => ({ user, accessToken, refreshToken }),
    },
  ),
);
