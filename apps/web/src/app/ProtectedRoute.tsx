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
    if (token && !user) void restore();
  }, [restore, token, user]);
  if (loading) return <Spinner label="Restoring session" />;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
