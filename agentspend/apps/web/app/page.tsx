
import Link from 'next/link';
export default function Home() {
  return <main className="mx-auto max-w-5xl px-6 py-20">
    <p className="font-mono text-sm text-as-blue">AGENTSPEND / FINANCIAL SECURITY</p>
    <h1 className="mt-6 max-w-4xl text-4xl font-bold tracking-tight md:text-6xl">
      Give AI agents the power to pay. Not the power to misuse your money.
    </h1>
    <p className="mt-6 max-w-2xl text-lg text-slate-300">
      AgentSpend is a prototype policy-enforcement layer. Agents request payments;
      the NEAR contract is intended to enforce the rules independently of the agent.
    </p>
    <div className="mt-8 rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-4 text-sm text-yellow-200">
      Current repository status: local simulation scaffold. Contract compilation,
      deployment and real testnet receipts have not been verified.
    </div>
    <Link className="mt-8 inline-block rounded-lg bg-as-blue px-5 py-3 font-semibold text-slate-950" href="/dashboard">
      Open dashboard prototype
    </Link>
  </main>;
}
