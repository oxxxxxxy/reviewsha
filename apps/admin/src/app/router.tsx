import { Navigate, Route, Routes } from 'react-router-dom';

import { AdminLayout } from '../layouts/AdminLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { AIPage } from '../pages/AI/AIPage';
import { DashboardPage } from '../pages/Dashboard/DashboardPage';
import { LoginPage } from '../pages/Login/LoginPage';
import { LogsPage } from '../pages/Logs/LogsPage';
import { LogDetailsPage } from '../pages/Logs/LogDetailsPage';
import { NotFoundPage } from '../pages/NotFound/NotFoundPage';
import { ProjectsPage } from '../pages/Projects/ProjectsPage';
import { QueuesPage } from '../pages/Queues/QueuesPage';
import { QueueDetailsPage } from '../pages/Queues/QueueDetailsPage';
import { JobDetailsPage } from '../pages/Queues/JobDetailsPage';
import { SettingsPage } from '../pages/Settings/SettingsPage';
import { UsersPage } from '../pages/Users/UsersPage';
import { UserDetailsPage } from '../pages/Users/UserDetailsPage';
import { ProjectDetailsPage } from '../pages/Projects/ProjectDetailsPage';
import { StatisticsPage } from '../pages/Statistics/StatisticsPage';
import { AdminProtectedRoute } from './AdminProtectedRoute';

export const adminRoutes = [
  '/login',
  '/dashboard',
  '/users',
  '/users/:id',
  '/projects',
  '/projects/:id',
  '/queues',
  '/queues/:queueName',
  '/queues/:queueName/jobs/:jobId',
  '/ai',
  '/logs',
  '/logs/:id',
  '/settings',
  '/statistics',
] as const;

export function AdminRouter() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<AdminProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/users/:id" element={<UserDetailsPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailsPage />} />
          <Route path="/queues" element={<QueuesPage />} />
          <Route path="/queues/:queueName" element={<QueueDetailsPage />} />
          <Route path="/queues/:queueName/jobs/:jobId" element={<JobDetailsPage />} />
          <Route path="/ai" element={<AIPage />} />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="/logs/:id" element={<LogDetailsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/statistics" element={<StatisticsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
