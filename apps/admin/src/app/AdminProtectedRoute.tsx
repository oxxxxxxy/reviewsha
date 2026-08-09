import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAdminAuthStore } from '../stores/auth.store';

export function AdminProtectedRoute() {
  const location = useLocation();
  const { user, isLoading, restore } = useAdminAuthStore();
  useEffect(() => {
    void restore();
  }, [restore]);
  if (isLoading)
    return (
      <main className="page">
        <p>Restoring admin session…</p>
      </main>
    );
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    return <Navigate to="/login" replace state={{ forbidden: true }} />;
  }
  return <Outlet />;
}
