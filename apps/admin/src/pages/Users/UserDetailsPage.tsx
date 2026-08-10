import { Card, Loader } from '@reviewsha/ui';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { adminSdk } from '../../api/client';

export function UserDetailsPage() {
  const { id } = useParams();
  const user = useQuery({
    enabled: Boolean(id),
    queryKey: ['admin', 'user', id],
    queryFn: () => adminSdk.admin.userDetails(id!),
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
        <p>{user.data.user.email}</p>
        <p>Role: {user.data.user.role}</p>
        <p>Status: {user.data.user.isActive === false ? 'BLOCKED' : 'ACTIVE'}</p>
        <p>Created: {user.data.user.createdAt}</p>
      </Card>
      <h2>Projects</h2>
      {user.data.projects.length ? (
        <ul>
          {user.data.projects.map((project) => (
            <li key={project.id}>{project.name}</li>
          ))}
        </ul>
      ) : (
        <p>No projects found.</p>
      )}
      <h2>Recent activity</h2>
      {user.data.activity.length ? (
        <ul>
          {user.data.activity.map((item) => (
            <li key={String(item.id)}>
              {String(item.action)} — {String(item.project)}
            </li>
          ))}
        </ul>
      ) : (
        <p>No activity found.</p>
      )}
      <Link to="/users">Back to users</Link>
    </section>
  );
}
