import { NavLink, Outlet } from 'react-router-dom';
import { Button } from '@reviewsha/ui';

import { useAdminAuthStore } from '../stores/auth.store';
import { useAdminUiStore } from '../stores/ui.store';

export const adminNavItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/users', label: 'Users' },
  { to: '/projects', label: 'Projects' },
  { to: '/queues', label: 'Queues' },
  { to: '/ai', label: 'AI' },
  { to: '/logs', label: 'Logs' },
  { to: '/settings', label: 'Settings' },
] as const;

export function AdminLayout() {
  const isSidebarOpen = useAdminUiStore((state) => state.isSidebarOpen);
  const toggleSidebar = useAdminUiStore((state) => state.toggleSidebar);
  const user = useAdminAuthStore((state) => state.user);
  const logout = useAdminAuthStore((state) => state.logout);

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar" data-open={isSidebarOpen} aria-label="Admin sidebar">
        <div className="admin-logo">Ревьюша Admin</div>
        <nav className="admin-nav" aria-label="Admin navigation">
          {adminNavItems.map((item) => (
            <NavLink key={item.to} to={item.to} className="admin-nav-link">
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="admin-main">
        <header className="admin-header">
          <button className="ghost-button" type="button" onClick={toggleSidebar}>
            Toggle sidebar
          </button>
          <span className="admin-header-title">System administration console</span>
          <span aria-label="Current admin">{user?.email ?? 'Admin'}</span>
          <Button type="button" onClick={() => void logout()}>
            Logout
          </Button>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
