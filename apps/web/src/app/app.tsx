import { ErrorBoundary } from '../common/errors/ErrorBoundary';
import { ToastViewport } from '../components/shared/ToastViewport';
import { AppRouter } from './router';
import { useEffect } from 'react';

export function App() {
  useEffect(() => {
    const theme = localStorage.getItem('reviewsha.theme') ?? 'system';
    const language = localStorage.getItem('reviewsha.language') ?? 'en';
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = language;
  }, []);
  return (
    <ErrorBoundary>
      <AppRouter />
      <ToastViewport />
    </ErrorBoundary>
  );
}
