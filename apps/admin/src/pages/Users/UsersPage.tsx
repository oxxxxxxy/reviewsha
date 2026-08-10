import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Badge, Button, EmptyState, Input, Loader, Table } from '@reviewsha/ui';
import { useState } from 'react';
import { adminSdk } from '../../api/client';

export function UsersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const users = useQuery({
    queryKey: ['admin', 'users', search, page],
    queryFn: () => adminSdk.admin.users({ limit: 20, page, search: search || undefined }),
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
      {rows.length ? (
        <Table
          rows={rows}
          getRowKey={(user) => user.id}
          columns={[
            {
              key: 'email',
              header: 'Email',
              render: (user) => <Link to={`/users/${user.id}`}>{user.email}</Link>,
            },
            { key: 'role', header: 'Role', render: (user) => <Badge>{user.role}</Badge> },
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
