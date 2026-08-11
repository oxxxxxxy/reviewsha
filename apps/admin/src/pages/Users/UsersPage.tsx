import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Badge, Button, EmptyState, Input, Loader, Table } from '@reviewsha/ui';
import { useState } from 'react';
import { adminSdk } from '../../api/client';

export function UsersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [role, setRole] = useState<'ALL' | 'USER' | 'ADMIN' | 'SUPER_ADMIN'>('ALL');
  const [status, setStatus] = useState<'ALL' | 'ACTIVE' | 'BLOCKED'>('ALL');
  const users = useQuery({
    queryKey: ['admin', 'users', search, page, role, status],
    queryFn: () =>
      adminSdk.admin.users({
        limit: 20,
        page,
        search: search || undefined,
        role: role === 'ALL' ? undefined : role,
        isActive: status === 'ALL' ? undefined : status === 'ACTIVE',
      }),
  });
  if (users.isLoading)
    return (
      <section className="page">
        <h1>Users</h1>
        <Loader label="Loading users" />
      </section>
    );
  if (users.isError)
    return (
      <section className="page">
        <h1>Users</h1>
        <p role="alert">
          Unable to load users. <button onClick={() => void users.refetch()}>Retry</button>
        </p>
      </section>
    );
  const rows = users.data?.items ?? [];
  return (
    <section className="page">
      <h1>Users</h1>
      <Input
        aria-label="Search users"
        placeholder="Search users"
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
      />
      <div className="filters" aria-label="User filters">
        <label>
          Role
          <select
            aria-label="Filter user role"
            value={role}
            onChange={(event) => {
              setRole(event.target.value as typeof role);
              setPage(1);
            }}
          >
            <option value="ALL">All roles</option>
            <option value="USER">User</option>
            <option value="ADMIN">Admin</option>
            <option value="SUPER_ADMIN">Super admin</option>
          </select>
        </label>
        <label>
          Status
          <select
            aria-label="Filter user status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as typeof status);
              setPage(1);
            }}
          >
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="BLOCKED">Blocked</option>
          </select>
        </label>
      </div>
      {rows.length ? (
        <Table
          rows={rows}
          getRowKey={(user) => user.id}
          columns={[
            { key: 'id', header: 'ID', render: (user) => <code>{user.id}</code> },
            {
              key: 'email',
              header: 'Email',
              render: (user) => <Link to={`/users/${user.id}`}>{user.email}</Link>,
            },
            { key: 'role', header: 'Role', render: (user) => <Badge>{user.role}</Badge> },
            {
              key: 'status',
              header: 'Status',
              render: (user) => (user.isActive ? 'ACTIVE' : 'BLOCKED'),
            },
            { key: 'created', header: 'Created', render: (user) => user.createdAt },
          ]}
        />
      ) : (
        <EmptyState title="No users found" />
      )}
      {users.data && users.data.meta.pages > 1 ? (
        <nav aria-label="User pages">
          <Button
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage((value) => value - 1)}
          >
            Previous
          </Button>{' '}
          <span>
            Page {page} of {users.data.meta.pages}
          </span>{' '}
          <Button
            variant="secondary"
            disabled={page >= users.data.meta.pages}
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </Button>
        </nav>
      ) : null}
    </section>
  );
}
