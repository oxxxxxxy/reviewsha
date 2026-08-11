import { Button, Input, Loader } from '@reviewsha/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { reviewshaSdk } from '../../api/client';
import { useAuthStore } from '../../stores/auth.store';
import { useUiStore } from '../../stores/ui.store';

export function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state._set);
  const pushToast = useUiStore((state) => state.pushToast);
  const client = useQueryClient();
  const [displayName, setDisplayName] = useState(user?.displayName ?? user?.name ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [language, setLanguage] = useState<'en' | 'ru'>(() =>
    localStorage.getItem('reviewsha.language') === 'ru' ? 'ru' : 'en',
  );
  const [notifications, setNotifications] = useState(
    () => localStorage.getItem('reviewsha.notifications') !== 'off',
  );
  const update = useMutation({
    mutationFn: () => reviewshaSdk.auth.updateMe({ displayName: displayName.trim() }),
    onSuccess: (next) => {
      setUser({ user: next });
      void client.invalidateQueries({ queryKey: ['current-user'] });
      pushToast('Profile updated successfully.');
    },
  });
  const changePassword = useMutation({
    mutationFn: () => reviewshaSdk.auth.changePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      pushToast('Password changed successfully.');
    },
  });
  const savePreferences = () => {
    localStorage.setItem('reviewsha.language', language);
    localStorage.setItem('reviewsha.notifications', notifications ? 'on' : 'off');
    document.documentElement.lang = language;
    pushToast(
      language === 'ru'
        ? 'Настройки сохранены. Ревью и чат будут отвечать на русском языке.'
        : 'Preferences saved. Reviews and chat will answer in English.',
    );
  };
  if (!user) return <Loader label="Loading profile" />;
  return (
    <section className="page settings-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Workspace preferences</span>
          <h1>Settings</h1>
          <p className="muted">Manage your profile, security and the language used by the AI.</p>
        </div>
      </div>

      <section className="settings-section form" aria-labelledby="profile-settings-title">
        <div className="settings-section-heading">
          <div>
            <h2 id="profile-settings-title">Profile</h2>
            <p className="muted">Your name is shown in the application header and workspace.</p>
          </div>
        </div>
        <p className="settings-readonly">
          <strong>Email</strong>
          <span>{user.email}</span>
        </p>
        <label>
          Display name
          <Input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="How should we address you?"
            aria-label="Display name"
          />
          <small className="muted">This name is visible only in your workspace.</small>
        </label>
        <Button
          disabled={!displayName.trim()}
          isLoading={update.isPending}
          onClick={() => update.mutate()}
        >
          Save profile
        </Button>
        {update.isError ? <p role="alert">Unable to update profile.</p> : null}
      </section>

      <section className="settings-section form" aria-labelledby="security-settings-title">
        <div className="settings-section-heading">
          <div>
            <h2 id="security-settings-title">Security</h2>
            <p className="muted">
              Change your password. We never display or store it in the browser.
            </p>
          </div>
        </div>
        <label>
          Current password
          <Input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            placeholder="Enter your current password"
            aria-label="Current password"
          />
        </label>
        <label>
          New password
          <Input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="At least 8 characters"
            aria-label="New password"
          />
        </label>
        <Button
          disabled={currentPassword.length < 8 || newPassword.length < 8}
          isLoading={changePassword.isPending}
          onClick={() => changePassword.mutate()}
        >
          Change password
        </Button>
        {changePassword.isError ? <p role="alert">Unable to change password.</p> : null}
      </section>

      <section className="settings-section form" aria-labelledby="preference-settings-title">
        <div className="settings-section-heading">
          <div>
            <h2 id="preference-settings-title">Preferences</h2>
            <p className="muted">
              Choose the language for the interface, code reviews and AI chat.
            </p>
          </div>
        </div>
        <label>
          AI and interface language
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value as 'en' | 'ru')}
            aria-label="AI and interface language"
          >
            <option value="en">English — reviews and chat in English</option>
            <option value="ru">Русский — ревью и чат на русском</option>
          </select>
          <small className="muted">
            The choice is applied to the next project review and new chat requests.
          </small>
        </label>
        <label className="settings-checkbox">
          <input
            type="checkbox"
            checked={notifications}
            onChange={(event) => setNotifications(event.target.checked)}
          />
          <span>
            <strong>Notifications</strong>
            <small className="muted">Show success and error notifications in the workspace.</small>
          </span>
        </label>
        <Button onClick={savePreferences}>Save preferences</Button>
      </section>
    </section>
  );
}
