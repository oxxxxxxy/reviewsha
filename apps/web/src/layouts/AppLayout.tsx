import { NavLink, Outlet } from 'react-router-dom';
import { Avatar, Button, Header, IconButton, Sidebar } from '@reviewsha/ui';
import { useQueryClient } from '@tanstack/react-query';

import { useUiStore } from '../stores/ui.store';
import { useAuthStore } from '../stores/auth.store';
import { useNavigate } from 'react-router-dom';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: 'home' },
  { to: '/projects', label: 'Projects', icon: 'grid' },
  { to: '/reports', label: 'Reports', icon: 'report' },
  { to: '/chat', label: 'Chat', icon: 'chat' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

function NavIcon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    home: 'M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z',
    grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
    report: 'M6 3h12v18H6zM9 7h6M9 11h6M9 15h4',
    chat: 'M4 5h16v11H8l-4 4z',
    settings: 'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z',
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={paths[name] ?? paths.grid} /></svg>;
}

export function AppLayout() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isSidebarOpen = useUiStore((state) => state.isSidebarOpen);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const pushToast = useUiStore((state) => state.pushToast);

  return (
    <div className="app-shell">
      <Sidebar className="app-sidebar" data-open={isSidebarOpen}>
        <div className="app-logo">
          <span className="logo-full">Ревьюша</span>
          <span className="logo-mark" aria-hidden="true">
            Р
          </span>
        </div>
        <nav className="app-nav" aria-label="Основная навигация">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className="app-nav-link"
              onClick={() => useUiStore.getState().setSidebarOpen(false)}
            >
              <span className="nav-icon" aria-hidden="true">
                <NavIcon name={item.icon} />
              </span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </Sidebar>

      <div className="app-main">
        <Header className="app-header">
          <IconButton className="ghost-button" label="Toggle sidebar" onClick={toggleSidebar}>
            ☰
          </IconButton>
          <span className="app-header-title">AI Code Review Platform</span>
          <span className="app-user">{user?.email}</span>
          <Button
            variant="secondary"
            type="button"
            onClick={() =>
              void logout().then(() => {
                queryClient.clear();
                pushToast('Signed out');
                navigate('/login');
              })
            }
          >
            Logout
          </Button>
          <Avatar name={user?.email ?? 'User'} />
        </Header>

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
