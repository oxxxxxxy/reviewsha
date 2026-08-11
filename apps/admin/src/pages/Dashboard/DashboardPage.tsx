import { Loader } from '@reviewsha/ui';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { adminSdk } from '../../api/client';

export function DashboardPage() {
  const overview = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: () => adminSdk.admin.overview(),
  });

  if (overview.isLoading)
    return (
      <section className="page">
        <Loader label="Loading dashboard" />
      </section>
    );
  if (overview.isError || !overview.data) {
    return (
      <section className="page page-panel">
        <p role="alert">Unable to load dashboard.</p>
        <button type="button" onClick={() => void overview.refetch()}>
          Retry
        </button>
      </section>
    );
  }

  const cards = [
    ['Users', overview.data.users, '◎'],
    ['Active users', overview.data.activeUsers, '◉'],
    ['Projects', overview.data.projects, '▦'],
    ['Analyses', overview.data.analyses, '⌁'],
    ['Reports ready', overview.data.reports, '✓'],
    ['AI requests', overview.data.aiRequests, '✦'],
    ['AI tokens', overview.data.aiTokens, '◌'],
    ['Archived projects', overview.data.archivedProjects, '□'],
  ];

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <div className="eyebrow">System overview</div>
          <h1>Dashboard</h1>
          <p>
            Good day, administrator. Keep an eye on your Reviewsha workspace and act on important
            changes quickly.
          </p>
        </div>
        <Link className="button-link" to="/ai">
          Configure AI gateway →
        </Link>
      </header>

      <div className="metric-grid">
        {cards.map(([label, value, icon]) => (
          <div className="metric-card" key={label}>
            <span className="metric-icon">{icon}</span>
            <div className="metric-label">{label}</div>
            <div className="metric-value">{value}</div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        <section className="page-panel">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">Shortcuts</div>
              <h2>Jump back into operations</h2>
            </div>
          </div>
          <div className="quick-actions">
            <QuickAction
              to="/users"
              icon="◎"
              title="Manage users"
              detail="Roles, access and status"
            />
            <QuickAction
              to="/projects"
              icon="▦"
              title="Inspect projects"
              detail="Versions and analyses"
            />
            <QuickAction
              to="/queues"
              icon="↯"
              title="Monitor queues"
              detail="Jobs and failed work"
            />
            <QuickAction
              to="/logs"
              icon="≡"
              title="Review audit logs"
              detail="Events and request traces"
            />
          </div>
        </section>
        <section className="page-panel">
          <div className="eyebrow">Operational health</div>
          <h2>Everything is connected</h2>
          <div className="health-summary">
            <span className="status-dot" />
            <strong>Core services operational</strong>
          </div>
          <p className="muted-copy">
            API, queues, storage and AI usage are available. Open AI control to test OmniRoute and
            choose the active model.
          </p>
          <Link className="text-link" to="/ai">
            Open AI control →
          </Link>
        </section>
      </div>
    </section>
  );
}

function QuickAction({
  to,
  icon,
  title,
  detail,
}: {
  to: string;
  icon: string;
  title: string;
  detail: string;
}) {
  return (
    <Link className="quick-action" to={to}>
      <span className="quick-action-icon">{icon}</span>
      <span>
        <strong>{title}</strong>
        <span>{detail}</span>
      </span>
    </Link>
  );
}
