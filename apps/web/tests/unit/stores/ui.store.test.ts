import { beforeEach, describe, expect, it } from 'vitest';

import { useUiStore } from '../../../src/stores/ui.store';

describe('useUiStore', () => {
  beforeEach(() => {
    useUiStore.setState({
      isSidebarOpen: true,
      theme: 'system',
      isGlobalLoading: false,
      toasts: [],
    });
  });

  it('has default UI state', () => {
    expect(useUiStore.getState().isSidebarOpen).toBe(true);
    expect(useUiStore.getState().theme).toBe('system');
    expect(useUiStore.getState().isGlobalLoading).toBe(false);
  });

  it('updates sidebar/theme/loading state', () => {
    useUiStore.getState().toggleSidebar();
    useUiStore.getState().setTheme('dark');
    useUiStore.getState().setGlobalLoading(true);

    expect(useUiStore.getState().isSidebarOpen).toBe(false);
    expect(useUiStore.getState().theme).toBe('dark');
    expect(useUiStore.getState().isGlobalLoading).toBe(true);
  });

  it('adds and removes toast notifications', () => {
    useUiStore.getState().pushToast('Saved');
    const toast = useUiStore.getState().toasts[0];
    expect(toast?.message).toBe('Saved');
    useUiStore.getState().removeToast(toast!.id);
    expect(useUiStore.getState().toasts).toEqual([]);
  });
});
