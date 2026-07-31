import { ErrorBoundary } from '../common/errors/ErrorBoundary';
import { AppRouter } from './router';

export function App() {
  return (
    <ErrorBoundary>
      <AppRouter />
    </ErrorBoundary>
  );
}
