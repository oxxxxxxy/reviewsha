import { NavLink, Outlet } from 'react-router-dom';

import { useUiStore } from '../stores/ui.store';
import { useAuthStore } from '../stores/auth.store';
import { useNavigate } from 'react-router-dom';

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/projects', label: 'Projects' },
  { to: '/chat', label: 'Chat' },
  { to: '/settings', label: 'Settings' },
];

export function AppLayout() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const isSidebarOpen = useUiStore((state) => state.isSidebarOpen);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);

  return (
    <div className="app-shell">
      <aside className="app-sidebar" data-open={isSidebarOpen}>
        <div className="app-logo">Ревьюша</div>
        <nav className="app-nav" aria-label="Основная навигация">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className="app-nav-link">
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="app-main">
        <header className="app-header">
          <button className="ghost-button" type="button" onClick={toggleSidebar}>
            Toggle sidebar
          </button>
          <span className="app-header-title">AI Code Review Platform</span>
          <span className="app-user">{user?.email}</span>
          <button type="button" onClick={() => void logout().then(() => navigate('/login'))}>
            Logout
          </button>
        </header>

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
