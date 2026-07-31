import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

function BrokenComponent(): React.JSX.Element {
  throw new Error('boom');
}

describe('web ErrorBoundary', () => {
  it('renders fallback and reports normalized frontend error', () => {
    const onError = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <ErrorBoundary fallback={<p>Fallback</p>} onError={onError}>
        <BrokenComponent />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Fallback')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'boom', source: 'error-boundary' }),
    );
  });
});
