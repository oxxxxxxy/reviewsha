import { beforeEach, describe, expect, it } from 'vitest';

import { useAdminUiStore } from '../../../src/stores/ui.store';

describe('useAdminUiStore', () => {
  beforeEach(() => {
    useAdminUiStore.getState().reset();
  });

  it('starts with production-safe UI defaults', () => {
    expect(useAdminUiStore.getState().isSidebarOpen).toBe(true);
    expect(useAdminUiStore.getState().theme).toBe('system');
    expect(useAdminUiStore.getState().isGlobalLoading).toBe(false);
  });

  it('toggles sidebar', () => {
    useAdminUiStore.getState().toggleSidebar();
    expect(useAdminUiStore.getState().isSidebarOpen).toBe(false);

    useAdminUiStore.getState().toggleSidebar();
    expect(useAdminUiStore.getState().isSidebarOpen).toBe(true);
  });

  it('sets sidebar open explicitly', () => {
    useAdminUiStore.getState().setSidebarOpen(false);
    expect(useAdminUiStore.getState().isSidebarOpen).toBe(false);
  });

  it('sets theme', () => {
    useAdminUiStore.getState().setTheme('dark');
    expect(useAdminUiStore.getState().theme).toBe('dark');
  });

  it('sets global loading', () => {
    useAdminUiStore.getState().setGlobalLoading(true);
    expect(useAdminUiStore.getState().isGlobalLoading).toBe(true);
  });

  it('resets all UI state', () => {
    useAdminUiStore.getState().setSidebarOpen(false);
    useAdminUiStore.getState().setTheme('dark');
    useAdminUiStore.getState().setGlobalLoading(true);

    useAdminUiStore.getState().reset();

    expect(useAdminUiStore.getState().isSidebarOpen).toBe(true);
    expect(useAdminUiStore.getState().theme).toBe('system');
    expect(useAdminUiStore.getState().isGlobalLoading).toBe(false);
  });
});
