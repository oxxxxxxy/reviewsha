import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Badge, EmptyState, Loader, Table } from '@reviewsha/ui';
import { adminSdk } from '../../api/client';

export function UsersPage() {
  const users = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => adminSdk.admin.users({ limit: 20 }),
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
    </section>
  );
}
