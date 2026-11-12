#!/usr/bin/env node
// Atomic deploy + init batch. Required by ERR_INIT_MUST_BE_SELF_BATCHED.
// Usage: node scripts/deploy-firewall.mjs --network testnet --owner <ACCOUNT>
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const networkIdx = args.indexOf('--network');
const ownerIdx = args.indexOf('--owner');
const network = args[networkIdx + 1];
const owner = args[ownerIdx + 1];

if (!['testnet', 'mainnet'].includes(network) || !owner) {
  console.error('Usage: deploy-firewall.mjs --network <testnet|mainnet> --owner <ACCOUNT>');
  process.exit(1);
}

const wasm = resolve('target/wasm32-unknown-unknown/release/agentspend.wasm');
if (!existsSync(wasm)) {
  console.error('WASM not found. Run: cargo build --target wasm32-unknown-unknown --release');
  process.exit(1);
}

const firewallId = `agentspend-${Date.now()}.${network === 'testnet' ? 'test.near' : 'near'}`;

console.log(`Creating subaccount ${firewallId}...`);
execSync(`near create-account ${firewallId} --masterAccount ${owner} --initialBalance 2 --networkId ${network}`, { stdio: 'inherit' });

console.log(`Deploying + initializing (atomic batch)...`);
execSync(
  `near deploy ${firewallId} ${wasm} ` +
  `--initFunction new --initArgs '{"owner":"${owner}"}' --initGas 300000000000000 ` +
  `--accountId ${owner} --networkId ${network}`,
  { stdio: 'inherit' }
);

console.log(`\n✅ Deployed: ${firewallId}`);
console.log(`   Owner:    ${owner}`);
console.log(`   Explorer: https://${network === 'testnet' ? 'testnet.' : ''}nearblocks.io/address/${firewallId}`);
console.log(`\nNext: fund the contract, allowlist recipients, create agent accounts.`);
