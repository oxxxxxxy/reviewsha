import { Badge, Button, EmptyState, Loader, Table } from '@reviewsha/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { adminSdk } from '../../api/client';

type SettingsForm = {
  provider: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  clearApiKey: boolean;
  maxTokens: number;
  temperature: number;
  timeoutMs: number;
};

const emptyForm: SettingsForm = {
  provider: 'deepseek',
  baseUrl: 'http://localhost:20128/v1',
  model: 'auto/best-coding',
  apiKey: '',
  clearApiKey: false,
  maxTokens: 4000,
  temperature: 0.2,
  timeoutMs: 60000,
};

export function AIPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SettingsForm>(emptyForm);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [provider, setProvider] = useState('');
  const [model, setModel] = useState('');
  const [userId, setUserId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [connectionMessage, setConnectionMessage] = useState<string>();
  const [connectionOk, setConnectionOk] = useState<boolean>();
  const [dashboardUrl, setDashboardUrl] = useState('');
  const settings = useQuery({
    queryKey: ['admin', 'ai-settings'],
    queryFn: () => adminSdk.admin.aiSettings(),
  });
  const params = {
    ...(from ? { from: new Date(`${from}T00:00:00.000Z`).toISOString() } : {}),
    ...(to ? { to: new Date(`${to}T23:59:59.999Z`).toISOString() } : {}),
    ...(provider ? { provider } : {}),
    ...(model ? { model } : {}),
    ...(userId ? { userId } : {}),
    ...(projectId ? { projectId } : {}),
  };
  const usage = useQuery({
    queryKey: ['admin', 'ai-usage', params],
    queryFn: () => adminSdk.admin.aiUsage(params),
  });
  const breakdown = useQuery({
    queryKey: ['admin', 'ai-usage', 'breakdown', params],
    queryFn: () => adminSdk.admin.aiUsageBreakdown(params),
  });
  const saveSettings = useMutation({
    mutationFn: () =>
      adminSdk.admin.updateAiSettings({ ...form, apiKey: form.apiKey || undefined }),
    onSuccess: async (data) => {
      setForm((current) => ({
        ...current,
        provider: data.provider,
        baseUrl: data.baseUrl,
        model: data.model,
        apiKey: '',
        clearApiKey: false,
        maxTokens: data.maxTokens,
        temperature: data.temperature,
        timeoutMs: data.timeoutMs,
      }));
      setDashboardUrl(data.dashboardUrl);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'ai-settings'] });
    },
  });
  const testConnection = useMutation({
    mutationFn: () => adminSdk.admin.testAiConnection(),
    onSuccess: (result) => {
      setConnectionMessage(
        `${result.message} ${result.modelsCount} models · ${result.latencyMs} ms`,
      );
      setConnectionOk(result.ok);
    },
    onError: (error) => {
      setConnectionMessage(error instanceof Error ? error.message : 'Connection test failed');
      setConnectionOk(false);
    },
  });

  useEffect(() => {
    if (!settings.data) return;
    setForm((current) => ({
      ...current,
      provider: settings.data.provider,
      baseUrl: settings.data.baseUrl,
      model: settings.data.model,
      maxTokens: settings.data.maxTokens,
      temperature: settings.data.temperature,
      timeoutMs: settings.data.timeoutMs,
    }));
    setDashboardUrl(settings.data.dashboardUrl);
  }, [settings.data]);

  if (settings.isLoading || usage.isLoading)
    return (
      <section className="page">
        <Loader label="Loading AI control center" />
      </section>
    );
  if (settings.isError || usage.isError || !settings.data || !usage.data)
    return (
      <section className="page page-panel">
        <p role="alert">Unable to load AI control center.</p>
        <button
          type="button"
          onClick={() => {
            void settings.refetch();
            void usage.refetch();
          }}
        >
          Retry
        </button>
      </section>
    );
  const models = settings.data.availableModels;

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <div className="eyebrow">AI operations</div>
          <h1>AI control center</h1>
          <p>
            Configure OmniRoute, choose the review model and monitor provider usage from one place.
          </p>
        </div>
        <a
          className="button-link"
          href={dashboardUrl || form.baseUrl.replace(/\/v1\/?$/u, '')}
          target="_blank"
          rel="noreferrer"
        >
          Open OmniRoute ↗
        </a>
      </header>

      <section className="page-panel">
        <div className="panel-heading">
          <div>
            <div className="eyebrow">Gateway configuration</div>
            <h2>Connection and model</h2>
          </div>
          <span className={settings.data.apiKeyConfigured ? 'status-pill' : 'status-pill blocked'}>
            <span className="status-dot" />
            {settings.data.apiKeyConfigured ? 'API key configured' : 'API key missing'}
          </span>
        </div>
        <p className="settings-note">
          Keys are encrypted at rest. The current key is never returned; leave the field empty to
          keep it unchanged.
        </p>
        <div className="settings-grid" style={{ marginTop: 20 }}>
          <label>
            Provider
            <input
              value={form.provider}
              onChange={(event) => setForm({ ...form, provider: event.target.value })}
            />
          </label>
          <label>
            Gateway base URL
            <input
              value={form.baseUrl}
              onChange={(event) => setForm({ ...form, baseUrl: event.target.value })}
            />
          </label>
          <label className="wide">
            API key
            <input
              type="password"
              autoComplete="new-password"
              placeholder={
                typeof settings.data.apiKeyMasked === 'string'
                  ? settings.data.apiKeyMasked
                  : 'Paste provider key'
              }
              value={form.apiKey}
              onChange={(event) =>
                setForm({ ...form, apiKey: event.target.value, clearApiKey: false })
              }
            />
            <span className="settings-note">
              {settings.data.apiKeyMasked
                ? `Stored key: ${settings.data.apiKeyMasked}`
                : 'No key stored yet.'}
            </span>
          </label>
          <label>
            Active model
            <select
              value={form.model}
              onChange={(event) => setForm({ ...form, model: event.target.value })}
            >
              <option value={form.model}>{form.model}</option>
              {models
                .filter((item) => item !== form.model)
                .map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Or enter model
            <input
              value={form.model}
              onChange={(event) => setForm({ ...form, model: event.target.value })}
            />
          </label>
          <label>
            Max output tokens
            <input
              type="number"
              min={128}
              max={128000}
              value={form.maxTokens}
              onChange={(event) => setForm({ ...form, maxTokens: Number(event.target.value) })}
            />
          </label>
          <label>
            Temperature
            <input
              type="number"
              min={0}
              max={2}
              step={0.1}
              value={form.temperature}
              onChange={(event) => setForm({ ...form, temperature: Number(event.target.value) })}
            />
          </label>
          <label>
            Request timeout (ms)
            <input
              type="number"
              min={1000}
              max={600000}
              value={form.timeoutMs}
              onChange={(event) => setForm({ ...form, timeoutMs: Number(event.target.value) })}
            />
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={form.clearApiKey}
              onChange={(event) =>
                setForm({ ...form, clearApiKey: event.target.checked, apiKey: '' })
              }
            />{' '}
            Clear stored API key
          </label>
        </div>
        <div className="settings-actions">
          <Button
            type="button"
            onClick={() => void saveSettings.mutateAsync()}
            isLoading={saveSettings.isPending}
          >
            Save AI settings
          </Button>
          <Button
            variant="secondary"
            type="button"
            onClick={() => void testConnection.mutateAsync()}
            isLoading={testConnection.isPending}
          >
            Test connection
          </Button>
          {saveSettings.isSuccess ? (
            <span className="success-text" role="status">
              Settings saved. Worker picks them up on the next AI request.
            </span>
          ) : null}
          {saveSettings.isError ? (
            <span className="error-text" role="alert">
              Unable to save settings.
            </span>
          ) : null}
        </div>
        {connectionMessage ? (
          <div className={`connection-state ${connectionOk ? 'success' : 'error'}`} role="status">
            <span className="status-dot" />
            {connectionMessage}
          </div>
        ) : null}
        <p className="settings-note">
          Available models:{' '}
          {models.length
            ? models.join(' · ')
            : 'not loaded — test the connection to refresh the catalog.'}
        </p>
      </section>

      <section className="page-panel">
        <div className="panel-heading">
          <div>
            <div className="eyebrow">Observability</div>
            <h2>Usage and failures</h2>
          </div>
          <Badge>{usage.data.requests} requests</Badge>
        </div>
        <div className="metric-grid" style={{ marginBottom: 20 }}>
          <MiniMetric label="Requests" value={usage.data.requests} />
          <MiniMetric label="Tokens" value={usage.data.tokens} />
          <MiniMetric label="Failures" value={usage.data.failures} />
          <MiniMetric label="Usage records" value={usage.data.usageRecords} />
        </div>
        <div className="filters" aria-label="AI usage filters">
          <label>
            From
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label>
            To
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </label>
          <label>
            Provider
            <input value={provider} onChange={(event) => setProvider(event.target.value)} />
          </label>
          <label>
            Model
            <input value={model} onChange={(event) => setModel(event.target.value)} />
          </label>
          <label>
            User ID
            <input value={userId} onChange={(event) => setUserId(event.target.value)} />
          </label>
          <label>
            Project ID
            <input value={projectId} onChange={(event) => setProjectId(event.target.value)} />
          </label>
        </div>
        {breakdown.data?.providers.length ? (
          <>
            <h2>By provider</h2>
            <Table
              rows={breakdown.data.providers}
              getRowKey={(row) => row.key}
              columns={[
                { key: 'provider', header: 'Provider', render: (row) => row.label ?? row.key },
                { key: 'requests', header: 'Requests', render: (row) => row.requests },
                { key: 'tokens', header: 'Tokens', render: (row) => row.tokens },
                { key: 'cost', header: 'Cost', render: (row) => row.cost },
              ]}
            />
          </>
        ) : (
          <EmptyState title="No provider usage for selected filters" />
        )}
        <h2 style={{ marginTop: 26 }}>Recent failures</h2>
        {usage.data.failuresList.length ? (
          <Table
            rows={usage.data.failuresList}
            getRowKey={(row) => row.id}
            columns={[
              { key: 'provider', header: 'Provider', render: (row) => row.provider },
              { key: 'model', header: 'Model', render: (row) => row.model },
              { key: 'project', header: 'Project', render: (row) => row.project ?? '—' },
              { key: 'error', header: 'Error', render: (row) => row.error ?? 'Unknown error' },
            ]}
          />
        ) : (
          <EmptyState title="No AI failures for selected period" />
        )}
      </section>
    </section>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
    </div>
  );
}
