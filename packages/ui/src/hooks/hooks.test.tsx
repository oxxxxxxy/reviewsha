import '../test/setup.js';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useDebounce, useModal, usePagination } from '../index.js';

function ModalHarness() {
  const modal = useModal();
  return (
    <div>
      <span>{modal.isOpen ? 'open' : 'closed'}</span>
      <button type="button" onClick={modal.open}>
        Open
      </button>
      <button type="button" onClick={modal.close}>
        Close
      </button>
      <button type="button" onClick={modal.toggle}>
        Toggle
      </button>
    </div>
  );
}

function PaginationHarness() {
  const pagination = usePagination({ totalItems: 45, pageSize: 20 });
  return (
    <div>
      <span>page:{pagination.page}</span>
      <span>total:{pagination.totalPages}</span>
      <button type="button" onClick={() => pagination.setPage(99)}>
        Last
      </button>
    </div>
  );
}

function DebounceHarness({ value }: { readonly value: string }) {
  const debounced = useDebounce(value, 50);
  return <span>{debounced}</span>;
}

describe('@reviewsha/ui hooks', () => {
  it('controls modal state', async () => {
    render(<ModalHarness />);

    expect(screen.getByText('closed')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByText('open')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.getByText('closed')).toBeInTheDocument();
  });

  it('clamps pagination page to total pages', async () => {
    render(<PaginationHarness />);

    expect(screen.getByText('total:3')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Last' }));
    expect(screen.getByText('page:3')).toBeInTheDocument();
  });

  it('debounces changing values', () => {
    vi.useFakeTimers();
    const { rerender } = render(<DebounceHarness value="first" />);

    expect(screen.getByText('first')).toBeInTheDocument();
    rerender(<DebounceHarness value="second" />);
    expect(screen.getByText('first')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(screen.getByText('second')).toBeInTheDocument();
    vi.useRealTimers();
  });
});
