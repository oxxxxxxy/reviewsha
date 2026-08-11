import http from 'node:http';
import net from 'node:net';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';

const routes = {
  web: 'http://127.0.0.1:15173',
  admin: 'http://127.0.0.1:15174',
  api: 'http://127.0.0.1:13000',
  omniroute: 'http://127.0.0.1:20129',
};

const kubectl =
  process.env.KUBECTL ??
  (existsSync('/tmp/reviewsha-k8s/kubectl') ? '/tmp/reviewsha-k8s/kubectl' : 'kubectl');
const context = process.env.KUBE_CONTEXT ?? 'kind-reviewsha-validation';
const forwards = [
  ['reviewsha-web', 15173, 80],
  ['reviewsha-admin', 15174, 80],
  ['reviewsha-api', 13000, 3000],
  ['omniroute', 20129, 20128],
];
const children = [];
const activeForwards = new Set();

function portOpen(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
  });
}

async function ensurePortForwards() {
  for (const [service, localPort, servicePort] of forwards) {
    if (await portOpen(localPort)) continue;
    if (activeForwards.has(service)) continue;
    activeForwards.add(service);
    const child = spawn(
      kubectl,
      [
        '--context',
        context,
        '-n',
        'reviewsha',
        'port-forward',
        `svc/${service}`,
        `${localPort}:${servicePort}`,
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    child.stdout.on('data', (chunk) => process.stdout.write(`[${service}] ${chunk}`));
    child.stderr.on('data', (chunk) => process.stderr.write(`[${service}] ${chunk}`));
    child.once('exit', () => activeForwards.delete(service));
    children.push(child);
  }
}

function targetFor(request) {
  const host = (request.headers.host ?? '').split(':')[0].toLowerCase();
  const apiPath = request.url?.startsWith('/api/') || request.url === '/api';
  if (host === 'admin.reviewsha.test') return apiPath ? routes.api : routes.admin;
  if (host === 'api.reviewsha.test') return routes.api;
  if (host === 'omni.reviewsha.test') return routes.omniroute;
  return apiPath ? routes.api : routes.web;
}

const hopByHop = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

const server = http.createServer(async (request, response) => {
  try {
    const target = `${targetFor(request)}${request.url ?? '/'}`;
    const headers = Object.fromEntries(
      Object.entries(request.headers).filter(([name]) => !hopByHop.has(name)),
    );
    headers.host = new URL(target).host;
    const init = { method: request.method, headers, redirect: 'manual' };
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      init.body = request;
      init.duplex = 'half';
    }
    const upstream = await fetch(target, init);
    response.writeHead(
      upstream.status,
      Object.fromEntries([...upstream.headers].filter(([name]) => !hopByHop.has(name))),
    );
    if (upstream.body) upstream.body.pipeTo(Writable.toWeb(response));
    else response.end();
  } catch (error) {
    response.writeHead(502, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ error: 'Local Kubernetes gateway unavailable' }));
    console.error(error);
  }
});

const { Writable } = await import('node:stream');
await ensurePortForwards();
setInterval(() => void ensurePortForwards(), 5000).unref();
server.listen(18080, '127.0.0.1', () => {
  console.log('Local domains gateway: http://app.reviewsha.test:18080');
});

function shutdown() {
  for (const child of children) child.kill('SIGTERM');
  server.close();
}
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
