import { test } from 'node:test';
import assert from 'node:assert/strict';

test('simulated responses never contain a hash-like value', async () => {
  const res = await api.post('/api/transactions/request').send(validBody('sim-1'));
  assert.equal(res.status, 200);
  assert.equal(res.body.executionMode, 'SIMULATED');
  assert.equal(res.body.nearTxHash, null);
  assert.equal(res.body.onChain, false);
  assert.doesNotMatch(JSON.stringify(res.body), /[1-9A-HJ-NP-Za-km-z]{32,44}/);
});

test('backend cannot approve: 410 and no key material', async () => {
  const res = await api.post('/api/transactions/pending-1/approve').send({});
  assert.equal(res.status, 410);
  assert.equal(res.body.error, 'APPROVAL_NOT_A_BACKEND_CAPABILITY');
  assert.doesNotMatch(JSON.stringify(res.body), /ed25519:/);
});

test('agent identity is taken from auth, not the request body', async () => {
  const res = await api.post('/api/transactions/request')
    .set('Authorization', 'Bearer agent-key-A')
    .send({ ...validBody('spoof-1'), agentId: 'some-other-agent.test.near' });
  assert.equal(res.body.agentAccountId, 'agent-a.test.near');
});

test('amount as float is rejected', async () => {
  const res = await api.post('/api/transactions/request')
    .send({ ...validBody('f-1'), amountYocto: 0.5 });
  assert.equal(res.status, 400);
});

test('owner-only routes reject agent credentials', async () => {
  const res = await api.put('/api/policies')
    .set('Authorization', 'Bearer agent-key-A').send({ dailyLimitYocto: '999' });
  assert.equal(res.status, 403);
});

test('simulated rows are excluded from spend stats', async () => {
  await api.post('/api/transactions/request').send(validBody('sim-stats'));
  const stats = await api.get('/api/dashboard/stats');
  assert.equal(stats.body.simulatedCount > 0, true);
  assert.equal(stats.body.onChainSpentYocto, '0');
});
