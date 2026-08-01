import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from '../../../../src/common/errors/ErrorBoundary';

function BrokenComponent(): React.JSX.Element {
  throw new Error('admin-boom');
}

describe('admin ErrorBoundary', () => {
  it('renders fallback and reports normalized frontend error', () => {
    const onError = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <ErrorBoundary fallback={<p>Admin fallback</p>} onError={onError}>
        <BrokenComponent />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Admin fallback')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'admin-boom', source: 'error-boundary' }),
    );
  });
});
