import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { adminSdk } from '../../../../src/api/client';
import { LogDetailsPage } from '../../../../src/pages/Logs/LogDetailsPage';
import { renderWithAdminProviders } from '../../../../src/test/render';

describe('LogDetailsPage', () => {
  beforeEach(() => {
    vi.spyOn(adminSdk.admin, 'log').mockResolvedValue({
      id: 'log-1',
      level: 'ERROR',
      service: 'API',
      context: 'request',
      event: 'chat.generation.failed',
      message: 'Provider timeout',
      requestId: 'request-1',
      traceId: 'trace-1',
      userId: 'user-1',
      projectId: 'project-1',
      jobId: 'job-1',
      metadata: { provider: 'omniroute' },
      stack: null,
      createdAt: '2026-08-11T00:00:00.000Z',
    } as never);
  });

  it('renders structured, non-secret log context', async () => {
    renderWithAdminProviders(
      <Routes>
        <Route path="/logs/:id" element={<LogDetailsPage />} />
      </Routes>,
      { route: '/logs/log-1' },
    );

    expect(await screen.findByText('Event: chat.generation.failed')).toBeInTheDocument();
    expect(screen.getByText('User ID: user-1')).toBeInTheDocument();
    expect(screen.getByLabelText('Log metadata')).toBeInTheDocument();
    expect(screen.getByLabelText('Log metadata')).toHaveTextContent('omniroute');
  });
});
