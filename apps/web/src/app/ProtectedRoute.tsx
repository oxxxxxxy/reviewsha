import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Spinner } from '@reviewsha/ui';
import { useAuthStore } from '../stores/auth.store';

export function ProtectedRoute() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.accessToken);
  const loading = useAuthStore((state) => state.isLoading);
  const restore = useAuthStore((state) => state.restore);
  useEffect(() => {
    // Persisted Zustand state may contain the user, while the in-memory SDK
    // client has not yet received the access token after a full page reload.
    // Restore also configures the refresh handler and hydrates the SDK token.
    if (token) void restore();
  }, [restore, token]);
  if (loading) return <Spinner label="Restoring session" />;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
