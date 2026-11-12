// VERIFY API names against your installed near-api-js major version before running.
// Property to prove: with this key, approve_payment / update_policy / transfer
// are rejected by the protocol itself, not by our code.
import { KeyPair, Account, connect, keyStores, utils } from 'near-api-js';

const [agentId, contractId, allowanceNear] = process.argv.slice(2);
const near = await connect({ networkId: 'testnet', keyStore: new keyStores.InMemoryKeyStore(),
  nodeUrl: 'https://rpc.testnet.near.org' });
const agent = await near.account(agentId);

const kp = KeyPair.fromRandom('ed25519');
await agent.addKey(
  kp.getPublicKey(),
  contractId,                       // receiver restricted to the firewall
  ['request_payment'],              // method allowlist
  utils.format.parseNearAmount(allowanceNear ?? '0.1'), // gas allowance, NOT spend budget
);
console.log('AGENT_SCOPED_PRIVATE_KEY=' + kp.toString()); // store in agent secret manager only
