import type { User } from '@reviewsha/types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { reviewshaSdk } from '../api/client';

type AuthState = {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  _set(state: Partial<AuthState>): void;
  login(email: string, password: string): Promise<void>;
  register(email: string, password: string, displayName: string): Promise<void>;
  restore(): Promise<void>;
  logout(): Promise<void>;
};

function configureRefresh(get: () => AuthState): void {
  reviewshaSdk.client.setRefreshTokenHandler(async () => {
    const refreshToken = get().refreshToken;
    if (!refreshToken) return null;
    try {
      const result = await reviewshaSdk.auth.refresh(refreshToken);
      reviewshaSdk.client.setAccessToken(result.accessToken);
      setAuthTokens(get, result);
      return result.accessToken;
    } catch {
      get().logout();
      return null;
    }
  });
}

function setAuthTokens(
  get: () => AuthState,
  result: { user: User; accessToken: string; refreshToken: string },
): void {
  get()._set({
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      _set: set,
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      async login(email, password) {
        configureRefresh(get);
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
        configureRefresh(get);
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
        configureRefresh(get);
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
          reviewshaSdk.client.setRefreshTokenHandler(undefined);
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
