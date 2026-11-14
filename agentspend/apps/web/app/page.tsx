
import Link from 'next/link';
export default function Home() {
  return <main className="min-h-screen overflow-hidden">
    <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
      <Link href="/" className="flex items-center gap-3 font-semibold tracking-tight"><span className="grid h-9 w-9 place-items-center rounded-xl bg-as-blue text-slate-950">A</span> AgentSpend</Link>
      <Link className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-as-blue hover:text-white" href="/auth">Sign in</Link>
    </nav>
    <section className="mx-auto grid max-w-7xl gap-14 px-6 pb-24 pt-16 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-10 lg:pt-24">
      <div>
        <p className="eyebrow">Financial firewall for autonomous agents</p>
        <h1 className="mt-6 max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight text-white md:text-7xl">Let agents move money. Keep control of the rules.</h1>
        <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-400">AgentSpend turns autonomous payment requests into a controlled workflow with policy checks, reservations, human approvals and an auditable decision trail.</p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link className="button-primary" href="/dashboard">Open control plane <span aria-hidden>→</span></Link>
          <Link className="button-secondary" href="/auth">Connect local API</Link>
        </div>
        <p className="mt-5 text-xs text-slate-500">The current build is explicitly labeled simulation until a verified testnet adapter is configured.</p>
      </div>
      <div className="relative">
        <div className="glow" />
        <div className="relative rounded-3xl border border-slate-800 bg-as-panel/90 p-5 shadow-2xl shadow-cyan-950/30">
          <div className="flex items-center justify-between border-b border-slate-800 pb-5"><div><p className="text-xs text-slate-500">SECURITY OVERVIEW</p><p className="mt-1 text-sm font-medium">Workspace / Demo environment</p></div><span className="status status-warning">SIMULATION</span></div>
          <div className="grid grid-cols-2 gap-3 py-5"><div className="metric-card"><p>Daily spend</p><strong>0.00 <small>NEAR</small></strong><span className="text-as-green">Within policy</span></div><div className="metric-card"><p>Reserved</p><strong>0.00 <small>NEAR</small></strong><span className="text-slate-500">No pending holds</span></div></div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4"><div className="flex items-center justify-between text-xs"><span className="text-slate-400">Policy utilization</span><span className="font-mono text-slate-300">0%</span></div><div className="mt-3 h-2 rounded-full bg-slate-800"><div className="h-2 w-0 rounded-full bg-as-blue" /></div></div>
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-800 p-4 text-sm"><span className="grid h-8 w-8 place-items-center rounded-full bg-as-green/10 text-as-green">✓</span><div><p className="font-medium">Policy engine ready</p><p className="text-xs text-slate-500">No transaction has bypassed controls</p></div></div>
        </div>
      </div>
    </section>
  </main>;
}
