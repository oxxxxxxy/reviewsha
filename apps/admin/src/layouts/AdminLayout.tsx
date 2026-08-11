import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Button } from '@reviewsha/ui';

import { useAdminAuthStore } from '../stores/auth.store';
import { useAdminUiStore } from '../stores/ui.store';

type NavItem = { to: string; label: string; icon: string; section: 'workspace' | 'system' };

export const adminNavItems: readonly NavItem[] = [
  { to: '/dashboard', label: 'Overview', icon: '⌂', section: 'workspace' },
  { to: '/users', label: 'Users', icon: '◎', section: 'workspace' },
  { to: '/projects', label: 'Projects', icon: '▦', section: 'workspace' },
  { to: '/queues', label: 'Queues', icon: '↯', section: 'system' },
  { to: '/ai', label: 'AI control', icon: '✦', section: 'system' },
  { to: '/logs', label: 'Audit logs', icon: '≡', section: 'system' },
  { to: '/statistics', label: 'Statistics', icon: '◔', section: 'system' },
  { to: '/settings', label: 'Settings', icon: '⚙', section: 'system' },
];

export function AdminLayout() {
  const location = useLocation();
  const isSidebarOpen = useAdminUiStore((state) => state.isSidebarOpen);
  const toggleSidebar = useAdminUiStore((state) => state.toggleSidebar);
  const user = useAdminAuthStore((state) => state.user);
  const logout = useAdminAuthStore((state) => state.logout);
  const initials = user?.displayName?.slice(0, 1) || user?.email.slice(0, 1).toUpperCase() || 'A';
  const current = adminNavItems.find(
    (item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`),
  );

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar" data-open={isSidebarOpen} aria-label="Admin sidebar">
        <div className="admin-brand">
          <div className="brand-mark">R</div>
          <div className="admin-brand-copy">
            <strong>Reviewsha</strong>
            <span>Control center</span>
          </div>
        </div>

        <div className="sidebar-label">Workspace</div>
        <nav className="admin-nav" aria-label="Workspace navigation">
          {adminNavItems
            .filter((item) => item.section === 'workspace')
            .map((item) => (
              <AdminNavLink key={item.to} item={item} />
            ))}
        </nav>
        <div className="sidebar-label">System</div>
        <nav className="admin-nav" aria-label="System navigation">
          {adminNavItems
            .filter((item) => item.section === 'system')
            .map((item) => (
              <AdminNavLink key={item.to} item={item} />
            ))}
        </nav>

        <div className="sidebar-footer">
          <span className="status-dot" />
          <span>All systems operational</span>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-header">
          <div className="header-left">
            <button
              className="icon-button"
              type="button"
              onClick={toggleSidebar}
              aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              ☰
            </button>
            <div className="breadcrumb">
              <span>Admin</span>
              <span>/</span>
              <strong>{current?.label ?? 'Control center'}</strong>
            </div>
          </div>
          <div className="header-actions">
            <span className="environment-badge">
              <span className="status-dot" />
              Local
            </span>
            <div className="admin-user-chip">
              <span className="avatar">{initials}</span>
              <span className="admin-user-copy">
                <strong>{user?.displayName || 'Administrator'}</strong>
                <small>{user?.email}</small>
              </span>
            </div>
            <Button variant="secondary" type="button" onClick={() => void logout()}>
              Sign out
            </Button>
          </div>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function AdminNavLink({ item }: { item: NavItem }) {
  return (
    <NavLink to={item.to} className="admin-nav-link">
      <span className="nav-icon" aria-hidden="true">
        {item.icon}
      </span>
      <span>{item.label}</span>
    </NavLink>
  );
}
