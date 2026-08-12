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
      // Do not call the logout endpoint here. It is itself authenticated and
      // would trigger the refresh interceptor again after a failed refresh.
      clearLocalSession(get);
      return null;
    }
  });
}

function clearLocalSession(get: () => AuthState): void {
  reviewshaSdk.client.clearAccessToken();
  reviewshaSdk.client.setRefreshTokenHandler(undefined);
  // Remove the persisted snapshot as well. Otherwise a revoked refresh token
  // can be restored on every page reload and keep the shell in a retry loop.
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem('reviewsha-auth');
    window.location.replace('/login');
  }
  get()._set({ user: null, accessToken: null, refreshToken: null });
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
          clearLocalSession(get);
        }
      },
    }),
    {
      name: 'reviewsha-auth',
      partialize: ({ user, accessToken, refreshToken }) => ({ user, accessToken, refreshToken }),
    },
  ),
);
