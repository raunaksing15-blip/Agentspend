import { strict as assert } from 'node:assert';
import { createServer, type Server } from 'node:http';
import { after, before, test } from 'node:test';
import { createApp } from '../src/server.js';

const agentToken = 'agent-test-token';
const ownerToken = 'owner-test-token';
const yocto = 10n ** 24n;
let server: Server;
let baseUrl: string;

function auth(token: string) {
  return { authorization: `Bearer ${token}` };
}

function validBody(id: string, amount = yocto / 2n) {
  return {
    id,
    recipient: 'vendor.test.near',
    amountYocto: amount.toString(),
    purpose: 'API credits',
    expiresAtNs: (BigInt(Date.now()) * 1_000_000n + 3_600_000_000_000n).toString(),
  };
}

async function request(path: string, init?: RequestInit) {
  return fetch(`${baseUrl}${path}`, init);
}

before(async () => {
  process.env.AGENT_API_TOKEN = agentToken;
  process.env.AGENT_ACCOUNT_ID = 'agent-a.test.near';
  process.env.OWNER_API_TOKEN = ownerToken;
  server = createServer(createApp());
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert(address && typeof address !== 'string');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

test('health is explicitly simulation-only', async () => {
  const response = await request('/api/health');
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    executionMode: 'SIMULATED',
    onChain: false,
  });
});

test('agent requests require authentication and never fabricate hashes', async () => {
  const unauthenticated = await request('/api/transactions/request', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(validBody('auth-1')),
  });
  assert.equal(unauthenticated.status, 401);

  const response = await request('/api/transactions/request', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...auth(agentToken) },
    body: JSON.stringify({ ...validBody('auth-2'), agentId: 'spoofed.test.near' }),
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.agentId, 'agent-a.test.near');
  assert.equal(body.executionMode, 'SIMULATED');
  assert.equal(body.onChain, false);
  assert.equal(body.nearTxHash, null);
});

test('invalid monetary and expiration inputs are rejected', async () => {
  const floatAmount = await request('/api/transactions/request', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...auth(agentToken) },
    body: JSON.stringify({ ...validBody('invalid-amount'), amountYocto: 0.5 }),
  });
  assert.equal(floatAmount.status, 400);

  const unsafeExpiration = await request('/api/transactions/request', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...auth(agentToken) },
    body: JSON.stringify({ ...validBody('invalid-expiry'), expiresAtNs: Number.MAX_SAFE_INTEGER + 1 }),
  });
  assert.equal(unsafeExpiration.status, 400);
});

test('owner-only dashboard data rejects agent credentials', async () => {
  const agentView = await request('/api/dashboard/stats', { headers: auth(agentToken) });
  assert.equal(agentView.status, 403);

  const ownerView = await request('/api/dashboard/stats', { headers: auth(ownerToken) });
  assert.equal(ownerView.status, 200);
});

test('duplicate IDs are rejected by the simulation', async () => {
  const first = await request('/api/transactions/request', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...auth(agentToken) },
    body: JSON.stringify(validBody('duplicate-1')),
  });
  const second = await request('/api/transactions/request', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...auth(agentToken) },
    body: JSON.stringify(validBody('duplicate-1')),
  });
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal((await second.json()).decision, 'REJECTED');
});

test('owner approval intent is authenticated and exposes no signing authority', async () => {
  const pending = await request('/api/transactions/request', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...auth(agentToken) },
    body: JSON.stringify(validBody('approval-1', (3n * yocto) / 2n)),
  });
  assert.equal(pending.status, 200);

  const agentIntent = await request('/api/transactions/approval-1/approval-intent', {
    method: 'POST',
    headers: auth(agentToken),
  });
  assert.equal(agentIntent.status, 403);

  const ownerIntent = await request('/api/transactions/approval-1/approval-intent', {
    method: 'POST',
    headers: auth(ownerToken),
  });
  assert.equal(ownerIntent.status, 200);
  const body = await ownerIntent.json();
  assert.equal(body.unsigned.actions[0].methodName, 'approve_payment');
  assert.equal(body.nearTxHash, undefined);
});

test('backend approval endpoint remains unavailable', async () => {
  const response = await request('/api/transactions/approval-1/approve', {
    method: 'POST',
    headers: auth(ownerToken),
  });
  assert.equal(response.status, 410);
});
