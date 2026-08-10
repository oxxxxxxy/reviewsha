import { Card, Loader } from '@reviewsha/ui';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { adminSdk } from '../../api/client';

export function UserDetailsPage() {
  const { id } = useParams();
  const user = useQuery({
    enabled: Boolean(id),
    queryKey: ['admin', 'user', id],
    queryFn: () => adminSdk.admin.user(id!),
  });
  if (user.isLoading)
    return (
      <section className="page">
        <h1>User</h1>
        <Loader label="Loading user" />
      </section>
    );
  if (user.isError || !user.data)
    return (
      <section className="page">
        <h1>User</h1>
        <p role="alert">Unable to load user.</p>
        <button onClick={() => void user.refetch()}>Retry</button>
      </section>
    );
  return (
    <section className="page">
      <h1>User</h1>
      <Card>
        <p>{user.data.email}</p>
        <p>Role: {user.data.role}</p>
        <p>Status: {user.data.isActive === false ? 'BLOCKED' : 'ACTIVE'}</p>
        <p>Created: {user.data.createdAt}</p>
      </Card>
      <Link to="/users">Back to users</Link>
    </section>
  );
}
