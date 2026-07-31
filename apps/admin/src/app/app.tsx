import { ErrorBoundary } from '../common/errors/ErrorBoundary';
import { AdminRouter } from './router';

export function App() {
  return (
    <ErrorBoundary>
      <AdminRouter />
    </ErrorBoundary>
  );
}
