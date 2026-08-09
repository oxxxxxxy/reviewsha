import type { User } from '@reviewsha/types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { reviewshaSdk } from '../api/client';

type AuthState = {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  login(email: string, password: string): Promise<void>;
  register(email: string, password: string, displayName: string): Promise<void>;
  restore(): Promise<void>;
  logout(): Promise<void>;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      async login(email, password) {
        set({ isLoading: true });
        try {
          const result = await reviewshaSdk.auth.login({ email, password });
          reviewshaSdk.client.setAccessToken(result.accessToken);
          set({
            user: result.user,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
          });
        } finally {
          set({ isLoading: false });
        }
      },
      async register(email, password, displayName) {
        set({ isLoading: true });
        try {
          const result = await reviewshaSdk.auth.register({ email, password, displayName });
          reviewshaSdk.client.setAccessToken(result.accessToken);
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
        const token = get().accessToken;
        if (!token) return;
        reviewshaSdk.client.setAccessToken(token);
        set({ isLoading: true });
        try {
          set({ user: await reviewshaSdk.auth.me() });
        } catch {
          set({ user: null, accessToken: null, refreshToken: null });
          reviewshaSdk.client.clearAccessToken();
        } finally {
          set({ isLoading: false });
        }
      },
      async logout() {
        const refreshToken = get().refreshToken;
        try {
          if (refreshToken) await reviewshaSdk.auth.logout(refreshToken);
        } finally {
          reviewshaSdk.client.clearAccessToken();
          set({ user: null, accessToken: null, refreshToken: null });
        }
      },
    }),
    {
      name: 'reviewsha-auth',
      partialize: ({ user, accessToken, refreshToken }) => ({ user, accessToken, refreshToken }),
    },
  ),
);
