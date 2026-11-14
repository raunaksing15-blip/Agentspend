const apiUrl = process.env.AGENTSPEND_API_URL ?? 'http://127.0.0.1:4000';
const agentToken = process.env.AGENT_API_TOKEN ?? 'demo-agent-token';
const ownerToken = process.env.OWNER_API_TOKEN ?? 'demo-owner-token';
const yocto = 10n ** 24n;

async function call(path, options = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers ?? {}) },
  });
  const body = await response.json();
  return { status: response.status, body };
}

function request(id, amount, recipient = 'vendor.test.near') {
  return {
    id,
    recipient,
    amountYocto: (BigInt(Math.round(amount * 1_000_000)) * 10n ** 18n).toString(),
    purpose: 'AgentSpend hackathon demonstration',
    expiresAtNs: (BigInt(Date.now()) * 1_000_000n + 3_600_000_000_000n).toString(),
  };
}

async function main() {
  const health = await call('/api/health');
  if (health.status !== 200 || health.body.executionMode !== 'SIMULATED') {
    throw new Error(`Expected a simulation API at ${apiUrl}; received ${health.status}`);
  }
  console.log(`AgentSpend demo — ${apiUrl} — SIMULATION ONLY`);

  const scenarios = [
    ['5 NEAR exceeds the transaction cap', request('demo-cap-5', 5)],
    ['0.5 NEAR is accepted for processing', request('demo-valid-05', 0.5)],
    ['unknown recipient is rejected', request('demo-recipient', 0.5, 'unknown.test.near')],
    ['1.5 NEAR requires human approval', request('demo-approval', 1.5)],
    ['2 NEAR is accepted into pending approval', request('demo-valid-2', 2)],
    ['first use of a request ID is accepted', request('demo-duplicate', 0.5)],
    ['replay of the same request ID is rejected', request('demo-duplicate', 0.5)],
    ['daily budget overrun is rejected', request('demo-daily-limit', 2)],
  ];

  for (const [label, body] of scenarios) {
    const result = await call('/api/transactions/request', {
      method: 'POST',
      headers: { authorization: `Bearer ${agentToken}` },
      body: JSON.stringify(body),
    });
    const decision = result.body.decision ?? result.body.error;
    console.log(`${result.status === 200 ? '✓' : '✗'} ${label}: ${decision} — ${result.body.reason ?? ''}`.trim());
  }

  const ownerStats = await call('/api/dashboard/stats', {
    headers: { authorization: `Bearer ${ownerToken}` },
  });
  if (ownerStats.status !== 200) throw new Error(`Owner dashboard check failed: ${ownerStats.status}`);
  console.log(`✓ owner dashboard: ${ownerStats.body.total} evaluated requests, ${ownerStats.body.blocked} blocked, ${ownerStats.body.pending} pending`);
  console.log('No real NEAR transaction was signed, broadcast, or given a fabricated hash.');
}

main().catch(error => {
  console.error(`Demo failed: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
