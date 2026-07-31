import { NavLink, Outlet } from 'react-router-dom';

import { useUiStore } from '../stores/ui.store';

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/projects', label: 'Projects' },
  { to: '/chat', label: 'Chat' },
  { to: '/settings', label: 'Settings' },
];

export function AppLayout() {
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
        </header>

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
