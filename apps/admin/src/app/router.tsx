import { Navigate, Route, Routes } from 'react-router-dom';

import { AdminLayout } from '../layouts/AdminLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { AIPage } from '../pages/AI/AIPage';
import { DashboardPage } from '../pages/Dashboard/DashboardPage';
import { LoginPage } from '../pages/Login/LoginPage';
import { LogsPage } from '../pages/Logs/LogsPage';
import { NotFoundPage } from '../pages/NotFound/NotFoundPage';
import { ProjectsPage } from '../pages/Projects/ProjectsPage';
import { QueuesPage } from '../pages/Queues/QueuesPage';
import { SettingsPage } from '../pages/Settings/SettingsPage';
import { UsersPage } from '../pages/Users/UsersPage';

export const adminRoutes = [
  '/login',
  '/dashboard',
  '/users',
  '/projects',
  '/queues',
  '/ai',
  '/logs',
  '/settings',
] as const;

export function AdminRouter() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<AdminLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/queues" element={<QueuesPage />} />
        <Route path="/ai" element={<AIPage />} />
        <Route path="/logs" element={<LogsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
