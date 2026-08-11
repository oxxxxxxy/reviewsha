import { useQuery } from '@tanstack/react-query';
import { reviewshaSdk } from '../../api/client';

export const dashboardProjectsQueryKey = ['projects', 'dashboard'] as const;

export function useDashboardProjects() {
  return useQuery({
    queryKey: dashboardProjectsQueryKey,
    retry: false,
    queryFn: ({ signal }) =>
      reviewshaSdk.projects.list({ limit: 100, sort: 'updatedAt', order: 'desc' }, signal),
  });
}
