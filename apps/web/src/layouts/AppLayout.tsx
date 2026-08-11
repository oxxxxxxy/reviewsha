import { NavLink, Outlet } from 'react-router-dom';
import { Avatar, Button, Header, IconButton, Sidebar } from '@reviewsha/ui';
import { useQueryClient } from '@tanstack/react-query';

import { useUiStore } from '../stores/ui.store';
import { useAuthStore } from '../stores/auth.store';
import { useNavigate } from 'react-router-dom';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '⌂' },
  { to: '/projects', label: 'Projects', icon: '▦' },
  { to: '/reports', label: 'Reports', icon: '▤' },
  { to: '/chat', label: 'Chat', icon: '◌' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
];

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
                {item.icon}
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
