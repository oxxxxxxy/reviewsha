import { Button, Card, Loader } from '@reviewsha/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { adminSdk } from '../../api/client';

type RoleValue = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

export function UserDetailsPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [role, setRole] = useState<RoleValue>('USER');
  const [isActive, setIsActive] = useState(true);
  const [saved, setSaved] = useState(false);
  const user = useQuery({
    enabled: Boolean(id),
    queryKey: ['admin', 'user', id],
    queryFn: () => adminSdk.admin.userDetails(id!),
  });
  useEffect(() => {
    if (!user.data) return;
    setRole(user.data.user.role);
    setIsActive(user.data.user.isActive);
  }, [user.data]);
  const update = useMutation({
    mutationFn: () => adminSdk.admin.updateUser(id!, { role, isActive }),
    onSuccess: async () => {
      setSaved(true);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'user', id] });
    },
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
      <Card>
        <h2>Administration</h2>
        <label>
          Role
          <select value={role} onChange={(event) => setRole(event.target.value as RoleValue)}>
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
          </select>
        </label>{' '}
        <label>
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
          />{' '}
          Active
        </label>{' '}
        <Button
          type="button"
          onClick={() => void update.mutateAsync()}
          isLoading={update.isPending}
        >
          Save changes
        </Button>
        {saved ? <p role="status">Changes saved.</p> : null}
        {update.isError ? <p role="alert">Unable to save changes.</p> : null}
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
