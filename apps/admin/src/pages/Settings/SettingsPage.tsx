import { Link } from 'react-router-dom';
import { useAdminAuthStore } from '../../stores/auth.store';

export function SettingsPage() {
  const user = useAdminAuthStore((state) => state.user);
  return (
    <section className="page">
      <header className="page-header">
        <div>
          <div className="eyebrow">Workspace preferences</div>
          <h1>Settings</h1>
          <p>Manage your admin session and jump to operational configuration.</p>
        </div>
      </header>
      <div className="split-grid">
        <section className="page-panel">
          <div className="eyebrow">Your access</div>
          <h2>Administrator profile</h2>
          <p>
            <strong>{user?.displayName || 'Administrator'}</strong>
          </p>
          <p className="muted-copy">{user?.email}</p>
          <span className="status-pill">
            <span className="status-dot" />
            {user?.role}
          </span>
        </section>
        <section className="page-panel">
          <div className="eyebrow">AI operations</div>
          <h2>OmniRoute gateway</h2>
          <p className="muted-copy">
            Configure the provider key, connection URL and active model without editing environment
            files.
          </p>
          <Link className="button-link" to="/ai">
            Open AI control center →
          </Link>
        </section>
      </div>
    </section>
  );
}
