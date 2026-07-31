import './test/setup.js';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  Pagination,
  Select,
  Table,
  Textarea,
  Tooltip,
  colors,
} from './index.js';

describe('@reviewsha/ui components', () => {
  it('renders button and handles click', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('disables button while loading', () => {
    render(<Button isLoading>Save</Button>);

    expect(screen.getByRole('button', { name: 'Loading...' })).toBeDisabled();
  });

  it('renders accessible input and validation error', () => {
    render(<Input name="email" label="Email" error="Required" />);

    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Required');
  });

  it('renders textarea and select options', () => {
    render(
      <>
        <Textarea name="message" label="Message" />
        <Select name="role" label="Role" options={[{ label: 'Admin', value: 'admin' }]} />
      </>,
    );

    expect(screen.getByLabelText('Message')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Admin' })).toHaveValue('admin');
  });

  it('renders modal only when open and calls close handler', async () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Modal isOpen={false} title="Confirm" onClose={onClose}>
        Body
      </Modal>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    rerender(
      <Modal isOpen title="Confirm" onClose={onClose}>
        Body
      </Modal>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Close modal' }));

    expect(screen.getByRole('dialog', { name: 'Confirm' })).toBeInTheDocument();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders card, badge, avatar, tooltip and empty state', () => {
    render(
      <>
        <Card title="Card title">Content</Card>
        <Badge tone="success">Active</Badge>
        <Avatar name="Ada Lovelace" />
        <Tooltip content="Help text">
          <button type="button">Help</button>
        </Tooltip>
        <EmptyState title="No projects" description="Create one" />
      </>,
    );

    expect(screen.getByText('Card title')).toBeInTheDocument();
    expect(screen.getByText('Active')).toHaveAttribute('data-tone', 'success');
    expect(screen.getByLabelText('Ada Lovelace')).toHaveTextContent('AL');
    expect(screen.getByRole('tooltip')).toHaveTextContent('Help text');
    expect(screen.getByText('No projects')).toBeInTheDocument();
  });

  it('renders table rows or empty text', () => {
    const { rerender } = render(
      <Table
        rows={[{ id: '1', name: 'Project' }]}
        getRowKey={(row) => row.id}
        columns={[{ key: 'name', header: 'Name', render: (row) => row.name }]}
      />,
    );

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Project')).toBeInTheDocument();

    rerender(
      <Table
        rows={[]}
        getRowKey={(row: { id: string }) => row.id}
        columns={[]}
        emptyText="Nothing"
      />,
    );
    expect(screen.getByText('Nothing')).toBeInTheDocument();
  });

  it('changes pagination page', async () => {
    const onPageChange = vi.fn();
    render(<Pagination page={2} totalPages={3} onPageChange={onPageChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Previous' }));
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(onPageChange).toHaveBeenNthCalledWith(1, 1);
    expect(onPageChange).toHaveBeenNthCalledWith(2, 3);
  });

  it('exports theme tokens', () => {
    expect(colors.primary).toBe('#2563eb');
  });
});
