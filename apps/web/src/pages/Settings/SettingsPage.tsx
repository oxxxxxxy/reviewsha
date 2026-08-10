import { Button, Input, Loader } from '@reviewsha/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { reviewshaSdk } from '../../api/client';
import { useAuthStore } from '../../stores/auth.store';

export function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state._set);
  const client = useQueryClient();
  const [displayName, setDisplayName] = useState(user?.displayName ?? user?.name ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem('reviewsha.theme') ?? 'system');
  const [language, setLanguage] = useState(
    () => localStorage.getItem('reviewsha.language') ?? 'en',
  );
  const [notifications, setNotifications] = useState(
    () => localStorage.getItem('reviewsha.notifications') !== 'off',
  );
  const update = useMutation({
    mutationFn: () => reviewshaSdk.auth.updateMe({ displayName: displayName.trim() }),
    onSuccess: (next) => {
      setUser({ user: next });
      void client.invalidateQueries({ queryKey: ['current-user'] });
    },
  });
  const changePassword = useMutation({
    mutationFn: () => reviewshaSdk.auth.changePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
    },
  });
  const savePreferences = () => {
    localStorage.setItem('reviewsha.theme', theme);
    localStorage.setItem('reviewsha.language', language);
    localStorage.setItem('reviewsha.notifications', notifications ? 'on' : 'off');
  };
  if (!user) return <Loader label="Loading profile" />;
  return (
    <section className="page">
      <h1>Settings</h1>
      <section className="form" aria-label="Profile settings">
        <p>{user.email}</p>
        <Input
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          aria-label="Display name"
        />
        <Button
          disabled={!displayName.trim()}
          isLoading={update.isPending}
          onClick={() => update.mutate()}
        >
          Save profile
        </Button>
        {update.isSuccess ? <p role="status">Profile updated.</p> : null}
        {update.isError ? <p role="alert">Unable to update profile.</p> : null}
      </section>
      <section className="form" aria-label="Security settings">
        <h2>Security</h2>
        <Input
          type="password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          aria-label="Current password"
        />
        <Input
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          aria-label="New password"
        />
        <Button
          disabled={currentPassword.length < 8 || newPassword.length < 8}
          isLoading={changePassword.isPending}
          onClick={() => changePassword.mutate()}
        >
          Change password
        </Button>
        {changePassword.isSuccess ? <p role="status">Password changed.</p> : null}
        {changePassword.isError ? <p role="alert">Unable to change password.</p> : null}
      </section>
      <section className="form" aria-label="Preferences">
        <h2>Preferences</h2>
        <label>
          Theme
          <select value={theme} onChange={(event) => setTheme(event.target.value)}>
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <label>
          Language
          <select value={language} onChange={(event) => setLanguage(event.target.value)}>
            <option value="en">English</option>
            <option value="ru">Русский</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={notifications}
            onChange={(event) => setNotifications(event.target.checked)}
          />
          Enable notifications
        </label>
        <Button onClick={savePreferences}>Save preferences</Button>
      </section>
    </section>
  );
}
