#!/usr/bin/env node

/**
 * Real vertical acceptance test. Unlike unit tests, this drives the running
 * API, object storage, worker, OmniRoute and configured AI provider.
 *
 * Usage:
 *   LIVE_API_BASE_URL=http://127.0.0.1:13000/api/v1 yarn test:ai:live
 *
 * The command intentionally fails unless a real analysis reaches COMPLETED,
 * produces at least one review and persists a report. It must not be added to
 * the default offline unit-test job because it requires a live deployment and
 * provider credentials.
 */

const baseUrl = (process.env.LIVE_API_BASE_URL ?? 'http://127.0.0.1:3000/api/v1').replace(
  /\/$/u,
  '',
);
const timeoutMs = Number(process.env.LIVE_ACCEPTANCE_TIMEOUT_MS ?? 300_000);
const email = process.env.LIVE_ACCEPTANCE_EMAIL ?? `acceptance-${Date.now()}@reviewsha.test`;
const password = process.env.LIVE_ACCEPTANCE_PASSWORD ?? `Acceptance-${Date.now()}!Aa1`;

const fail = (message, details) => {
  console.error(`LIVE ACCEPTANCE FAILED: ${message}`);
  if (details) console.error(JSON.stringify(details, null, 2));
  process.exit(1);
};

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'content-type': 'application/json' }),
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok)
    fail(`${options.method ?? 'GET'} ${path} returned HTTP ${response.status}`, body);
  return body;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const auth = process.env.LIVE_API_TOKEN
  ? { accessToken: process.env.LIVE_API_TOKEN, refreshToken: null }
  : await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName: 'Live Acceptance' }),
    });
const headers = { authorization: `Bearer ${auth.accessToken}` };

const projectResponse = await request('/projects', {
  method: 'POST',
  headers,
  body: JSON.stringify({
    name: `Live acceptance ${new Date().toISOString()}`,
    description: 'Real API-to-worker-to-AI acceptance project',
    language: 'Python',
    tags: ['acceptance'],
  }),
});
const project = projectResponse.data ?? projectResponse;

const form = new FormData();
form.append(
  'file',
  new Blob(
    ['def risky(value):\n    try:\n        return value[0]\n    except Exception:\n        pass\n'],
    { type: 'text/x-python' },
  ),
  'acceptance.py',
);
const upload = await request(`/projects/${project.id}/uploads`, {
  method: 'POST',
  headers,
  body: form,
});
const analysisResponse = await request(
  `/projects/${project.id}/analyses?uploadId=${encodeURIComponent(upload.id)}&language=en`,
  {
    method: 'POST',
    headers,
  },
);
const analysisId = (analysisResponse.data ?? analysisResponse).id;
const deadline = Date.now() + timeoutMs;
let analysis;
while (Date.now() < deadline) {
  const response = await request(`/projects/${project.id}/analyses`, { headers });
  analysis = (response.data ?? []).find((item) => item.id === analysisId);
  if (!analysis) fail('started analysis disappeared from the API');
  if (analysis.status === 'COMPLETED' || analysis.status === 'FAILED') break;
  await sleep(3000);
}

if (!analysis || analysis.status !== 'COMPLETED' || analysis.pipelineStatus !== 'COMPLETED') {
  fail('analysis did not complete successfully', analysis);
}
if (
  !analysis.reviewTotal ||
  analysis.reviewCompleted !== analysis.reviewTotal ||
  analysis.reviewFailed !== 0
) {
  fail('analysis completed without a complete review set', analysis);
}

const reportsResponse = await request(`/projects/${project.id}/reports`, { headers });
const reports = reportsResponse.data ?? [];
const analysesResponse = await request(`/projects/${project.id}/analyses`, { headers });
const analyses = analysesResponse.data ?? [];
if (analyses.length !== 1) fail('one upload produced duplicate analyses', { analyses, reports });
if (reports.length !== 1)
  fail('completed analysis did not persist exactly one report', { analysis, analyses, reports });

console.log(
  JSON.stringify(
    {
      ok: true,
      projectId: project.id,
      analysisId,
      status: analysis.status,
      reviews: {
        total: analysis.reviewTotal,
        completed: analysis.reviewCompleted,
        failed: analysis.reviewFailed,
      },
      reports: reports.length,
    },
    null,
    2,
  ),
);
