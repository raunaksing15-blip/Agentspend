
const scenarios = [
  ['A', 'Normal payment', '0.5 NEAR', 'Expected policy result: approved'],
  ['B', 'Excessive payment', '3 NEAR', 'Expected policy result: rejected'],
  ['C', 'Human approval', '1.5 NEAR', 'Expected policy result: pending owner approval'],
  ['D', 'Unknown recipient', '0.5 NEAR', 'Expected policy result: rejected'],
  ['E', 'Duplicate request', 'same request ID', 'Expected policy result: second request rejected'],
  ['F', 'Daily budget exceeded', '6 NEAR', 'Expected policy result: rejected']
];
export default function Dashboard() {
  return <main className="mx-auto max-w-6xl px-6 py-12">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div><p className="font-mono text-xs text-as-blue">AGENTSPEND CONTROL</p><h1 className="mt-2 text-3xl font-bold">Security dashboard</h1></div>
      <span className="rounded-full border border-yellow-500/50 px-3 py-2 text-xs font-mono text-yellow-300">LOCAL / SIMULATION SCAFFOLD</span>
    </header>
    <section className="mt-8 grid gap-4 sm:grid-cols-3">
      {['On-chain spend: 0','Real receipts: 0','Contract deployment: unverified'].map(x =>
        <div key={x} className="rounded-xl border border-slate-800 bg-as-panel p-5"><p className="text-sm text-slate-300">{x}</p></div>)}
    </section>
    <h2 className="mt-12 text-xl font-semibold">Agent security scenarios</h2>
    <p className="mt-2 text-sm text-slate-400">These are expected outcomes, not claims of executed transactions. The UI is a presentation scaffold.</p>
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      {scenarios.map(([id,title,amount,expected]) => <article key={id} className="rounded-xl border border-slate-800 bg-as-panel p-5">
        <p className="font-mono text-xs text-as-blue">SCENARIO {id}</p><h3 className="mt-2 text-lg font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-slate-300">{amount}</p><p className="mt-3 text-xs text-yellow-200">{expected}</p>
      </article>)}
    </div>
  </main>;
}
