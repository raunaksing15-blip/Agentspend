'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

type Transaction = {
  id: string;
  agentId?: string;
  recipient: string;
  amountYocto: string;
  purpose: string;
  decision?: string;
  reason?: string;
  status: string;
  executionMode?: string;
  nearTxHash?: string | null;
  onChain?: boolean;
  createdAt?: string;
};

type Stats = { total: number; simulatedCount: number; onChainSpentYocto: string; blocked: number; pending: number };
type View = 'overview' | 'agents' | 'policies' | 'requests' | 'approvals' | 'history' | 'audit' | 'settings';

const nav: Array<{ id: View; label: string; icon: string }> = [
  { id: 'overview', label: 'Overview', icon: '⌂' },
  { id: 'agents', label: 'Agents', icon: '◈' },
  { id: 'policies', label: 'Spending policies', icon: '⌁' },
  { id: 'requests', label: 'Transaction requests', icon: '↗' },
  { id: 'approvals', label: 'Human approvals', icon: '✓' },
  { id: 'history', label: 'Transaction history', icon: '◷' },
  { id: 'audit', label: 'Security audit log', icon: '⌕' },
];

const yoctoToNear = (value: string | undefined) => {
  if (!value) return '0.00';
  return (Number(value) / 1e24).toFixed(2);
};

export default function DashboardClient() {
  const [view, setView] = useState<View>('overview');
  const [token, setToken] = useState('');
  const [tokenDraft, setTokenDraft] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showRequest, setShowRequest] = useState(false);

  useEffect(() => {
    setToken(window.sessionStorage.getItem('agentspend-owner-token') ?? '');
  }, []);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [statsResponse, transactionsResponse] = await Promise.all([
        fetch('/api/dashboard/stats', { headers }),
        fetch('/api/transactions', { headers }),
      ]);
      if (!statsResponse.ok || !transactionsResponse.ok) throw new Error('Owner authentication failed. Check your API token.');
      const statsData = (await statsResponse.json()) as Stats;
      const transactionsData = (await transactionsResponse.json()) as { items: Transaction[] };
      setStats(statsData);
      setTransactions(transactionsData.items);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load the control plane.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void loadData(); }, [loadData]);

  const saveToken = () => {
    window.sessionStorage.setItem('agentspend-owner-token', tokenDraft);
    setToken(tokenDraft);
    setMessage('Owner session saved for this browser session.');
  };

  const filtered = useMemo(() => {
    if (view === 'approvals') return transactions.filter(item => item.status === 'PendingApproval');
    if (view === 'history') return transactions;
    if (view === 'audit') return transactions;
    return transactions;
  }, [transactions, view]);

  return <div className="flex min-h-screen bg-as-bg">
    <aside className="hidden w-64 shrink-0 border-r border-slate-800/80 bg-slate-950/30 px-4 py-6 lg:block">
      <Link href="/" className="mb-10 flex items-center gap-3 px-3 font-semibold"><span className="grid h-9 w-9 place-items-center rounded-xl bg-as-blue text-slate-950">A</span> AgentSpend</Link>
      <p className="px-3 text-[10px] font-semibold uppercase tracking-[.2em] text-slate-600">Control plane</p>
      <nav className="mt-3 space-y-1">{nav.map(item => <button key={item.id} onClick={() => setView(item.id)} className={`side-link ${view === item.id ? 'side-link-active' : ''}`}><span className="w-5 text-center text-sm">{item.icon}</span>{item.label}{item.id === 'approvals' && stats?.pending ? <span className="ml-auto rounded-full bg-as-blue px-2 py-0.5 text-[10px] text-slate-950">{stats.pending}</span> : null}</button>)}</nav>
      <div className="mt-10 border-t border-slate-800 pt-5"><p className="px-3 text-[10px] font-semibold uppercase tracking-[.2em] text-slate-600">Workspace</p><button onClick={() => setView('settings')} className={`side-link mt-3 ${view === 'settings' ? 'side-link-active' : ''}`}><span className="w-5 text-center">⚙</span>Settings</button></div>
      <div className="mt-10 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4"><span className="status status-warning">SIMULATION</span><p className="mt-3 text-xs leading-5 text-slate-400">No funds move and no transaction hash is generated in this environment.</p></div>
    </aside>
    <main className="min-w-0 flex-1">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 px-5 py-5 sm:px-8"><div><p className="eyebrow">Workspace / Demo environment</p><h1 className="mt-1 text-xl font-semibold text-white">{nav.find(item => item.id === view)?.label ?? 'Settings'}</h1></div><div className="flex items-center gap-3"><span className="hidden text-xs text-slate-500 sm:block">{loading ? 'Refreshing…' : 'Last checked just now'}</span><button className="button-secondary !px-3 !py-2 text-xs" onClick={() => void loadData()}>Refresh</button><div className="grid h-9 w-9 place-items-center rounded-full border border-as-blue/30 bg-as-blue/10 text-sm text-as-blue">O</div></div></header>
      <div className="border-b border-slate-800/80 px-5 py-3 lg:hidden"><div className="flex gap-2 overflow-x-auto">{nav.map(item => <button key={item.id} onClick={() => setView(item.id)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs ${view === item.id ? 'bg-as-blue text-slate-950' : 'bg-slate-900 text-slate-400'}`}>{item.label}</button>)}</div></div>
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        {error && <div className="mb-6 flex items-start justify-between rounded-xl border border-as-red/30 bg-as-red/10 p-4 text-sm text-red-200"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error">×</button></div>}
        {message && <div className="mb-6 rounded-xl border border-as-green/30 bg-as-green/10 p-4 text-sm text-green-200">{message}</div>}
        {!token ? <AuthCard tokenDraft={tokenDraft} setTokenDraft={setTokenDraft} saveToken={saveToken} /> : view === 'overview' ? <Overview stats={stats} transactions={transactions} onRequest={() => setShowRequest(true)} /> : view === 'settings' ? <Settings token={token} tokenDraft={tokenDraft} setTokenDraft={setTokenDraft} saveToken={saveToken} /> : view === 'agents' || view === 'policies' ? <ComingSoon title={view === 'agents' ? 'Agent management' : 'Spending policies'} text="This surface is ready for the contract-backed registry and policy endpoints. The current API exposes transaction simulation only." /> : <TransactionTable view={view} transactions={filtered} onRequest={() => setShowRequest(true)} />}
      </div>
    </main>
    {showRequest && <RequestModal token={token} onClose={() => setShowRequest(false)} onDone={() => { setShowRequest(false); setMessage('Request evaluated by the simulation policy engine.'); void loadData(); }} />}
  </div>;
}

function AuthCard({ tokenDraft, setTokenDraft, saveToken }: { tokenDraft: string; setTokenDraft: (value: string) => void; saveToken: () => void }) {
  return <div className="mx-auto max-w-lg rounded-3xl border border-slate-800 bg-as-panel p-7"><span className="status status-info">OWNER SESSION</span><h2 className="mt-5 text-2xl font-semibold">Connect the control plane</h2><p className="mt-2 text-sm leading-6 text-slate-400">Enter the owner API token configured for the local API. It is kept in session storage only and never sent anywhere except your configured API.</p><label className="mt-6 block text-xs font-medium text-slate-400">Owner API token<input value={tokenDraft} onChange={event => setTokenDraft(event.target.value)} type="password" className="input mt-2" placeholder="OWNER_API_TOKEN" /></label><button className="button-primary mt-5 w-full justify-center" onClick={saveToken}>Open secure workspace</button></div>;
}

function Overview({ stats, transactions, onRequest }: { stats: Stats | null; transactions: Transaction[]; onRequest: () => void }) {
  return <><div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Financial guardrails</p><h2 className="mt-2 text-3xl font-semibold">Good morning, owner.</h2><p className="mt-2 text-sm text-slate-400">Monitor every request before it can become a payment.</p></div><button className="button-primary" onClick={onRequest}>+ Simulate request</button></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Stat label="Total requests" value={String(stats?.total ?? 0)} detail="This workspace" /><Stat label="Blocked" value={String(stats?.blocked ?? 0)} detail="Policy prevented" tone="red" /><Stat label="Pending approval" value={String(stats?.pending ?? 0)} detail="Owner action needed" tone="yellow" /><Stat label="On-chain spend" value={`${yoctoToNear(stats?.onChainSpentYocto)} NEAR`} detail="Verified receipts only" tone="green" /></div><div className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_1fr]"><section className="panel"><div className="panel-heading"><div><p className="eyebrow">Activity</p><h3 className="mt-1 text-lg font-semibold">Recent requests</h3></div><span className="status status-info">LIVE API</span></div>{transactions.length ? <div className="divide-y divide-slate-800">{transactions.slice(0, 5).map(tx => <TransactionRow key={tx.id} tx={tx} />)}</div> : <EmptyState text="No transaction requests have been evaluated yet." />}</section><section className="panel"><div className="panel-heading"><div><p className="eyebrow">Policy health</p><h3 className="mt-1 text-lg font-semibold">Workspace protection</h3></div><span className="text-as-green">● Active</span></div><div className="space-y-5 p-5"><Progress label="Daily budget reserved" value="0 NEAR of 5 NEAR" percent={0} /><Progress label="Agent access" value="1 configured agent" percent={100} /><div className="rounded-xl border border-as-green/20 bg-as-green/5 p-4 text-sm text-slate-300"><span className="font-medium text-as-green">Protected by default.</span> Rejected requests never create a transaction hash.</div></div></section></div></>;
}

function Stat({ label, value, detail, tone = 'blue' }: { label: string; value: string; detail: string; tone?: string }) { return <div className="metric-card"><p className="text-slate-400">{label}</p><strong className={`text-${tone === 'blue' ? 'white' : `as-${tone}`}`}>{value}</strong><span>{detail}</span></div>; }
function Progress({ label, value, percent }: { label: string; value: string; percent: number }) { return <div><div className="flex justify-between text-xs"><span className="text-slate-400">{label}</span><span className="font-mono text-slate-300">{value}</span></div><div className="mt-2 h-2 rounded-full bg-slate-800"><div className="h-2 rounded-full bg-as-blue" style={{ width: `${percent}%` }} /></div></div>; }
function TransactionRow({ tx }: { tx: Transaction }) { const status = tx.status.toLowerCase().includes('reject') ? 'status-danger' : tx.status.toLowerCase().includes('pending') ? 'status-warning' : 'status-success'; return <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div className="flex min-w-0 items-center gap-3"><span className={`status-dot ${status}`} /><div className="min-w-0"><p className="truncate text-sm font-medium">{tx.purpose}</p><p className="truncate text-xs text-slate-500">{tx.id} · {tx.recipient}</p></div></div><div className="text-right"><p className="font-mono text-sm">{yoctoToNear(tx.amountYocto)} NEAR</p><p className={`text-xs ${status.replace('status-', 'text-')}`}>{tx.status}</p></div></div>; }
function TransactionTable({ view, transactions, onRequest }: { view: View; transactions: Transaction[]; onRequest: () => void }) { return <section className="panel"><div className="panel-heading"><div><p className="eyebrow">{view === 'audit' ? 'Immutable decision trail' : 'Requests evaluated by the API'}</p><h2 className="mt-1 text-xl font-semibold">{view === 'approvals' ? 'Pending owner approvals' : view === 'audit' ? 'Security events' : 'Transaction history'}</h2></div>{view === 'requests' && <button className="button-primary !px-3 !py-2 text-xs" onClick={onRequest}>+ New request</button>}</div>{transactions.length ? <div className="divide-y divide-slate-800">{transactions.map(tx => <TransactionRow key={tx.id} tx={tx} />)}</div> : <EmptyState text={view === 'approvals' ? 'No requests are waiting for owner approval.' : 'No activity matches this view yet.'} />}</section>; }
function EmptyState({ text }: { text: string }) { return <div className="p-10 text-center text-sm text-slate-500">{text}</div>; }
function ComingSoon({ title, text }: { title: string; text: string }) { return <div className="panel p-8"><span className="status status-warning">API SURFACE PENDING</span><h2 className="mt-5 text-2xl font-semibold">{title}</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">{text}</p></div>; }
function Settings({ token, tokenDraft, setTokenDraft, saveToken }: { token: string; tokenDraft: string; setTokenDraft: (value: string) => void; saveToken: () => void }) { return <div className="grid max-w-3xl gap-6"><section className="panel p-6"><p className="eyebrow">Authentication</p><h2 className="mt-2 text-xl font-semibold">Owner session</h2><p className="mt-2 text-sm text-slate-400">Active token: {token.slice(0, 4)}••••</p><input value={tokenDraft} onChange={event => setTokenDraft(event.target.value)} type="password" className="input mt-5" placeholder="Replace owner token" /><button className="button-secondary mt-4" onClick={saveToken}>Update session</button></section><section className="panel border-red-500/20 p-6"><p className="eyebrow text-red-300">Emergency controls</p><h2 className="mt-2 text-xl font-semibold">Pause spending</h2><p className="mt-2 text-sm text-slate-400">The pause action will be enabled when the contract-backed admin endpoint is connected. Simulation mode never moves funds.</p><button disabled className="button-danger mt-5 opacity-50">Pause all agents</button></section></div>; }
function RequestModal({ token, onClose, onDone }: { token: string; onClose: () => void; onDone: () => void }) { const [form, setForm] = useState({ id: `demo-${Date.now()}`, recipient: 'vendor.test.near', amount: '0.5', purpose: 'Dashboard test payment' }); const [submitting, setSubmitting] = useState(false); const [error, setError] = useState(''); const submit = async () => { setSubmitting(true); setError(''); try { const million = BigInt('1000000'); const yoctoPerMicroNear = BigInt('1000000000000000000'); const expiresAtNs = (BigInt(Date.now()) * million + BigInt('86400000000000')).toString(); const response = await fetch('/api/transactions/request', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ id: form.id, recipient: form.recipient, amountYocto: (BigInt(Math.round(Number(form.amount) * 1e6)) * yoctoPerMicroNear).toString(), purpose: form.purpose, expiresAtNs }) }); if (!response.ok) { const body = await response.json().catch(() => null) as { error?: string } | null; throw new Error(body?.error ?? 'Request was rejected by the API.'); } onDone(); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to submit request.'); } finally { setSubmitting(false); } }; return <div className="fixed inset-0 z-10 grid place-items-center bg-slate-950/80 p-5"><div className="w-full max-w-lg rounded-3xl border border-slate-700 bg-as-panel p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="eyebrow">Simulation request</p><h2 className="mt-2 text-xl font-semibold">Evaluate a payment</h2></div><button onClick={onClose} className="text-2xl text-slate-500">×</button></div><div className="mt-6 grid gap-4"><label className="text-xs text-slate-400">Amount (NEAR)<input className="input mt-2" type="number" min="0.000001" step="0.1" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></label><label className="text-xs text-slate-400">Recipient<input className="input mt-2" value={form.recipient} onChange={e => setForm({ ...form, recipient: e.target.value })} /></label><label className="text-xs text-slate-400">Purpose<input className="input mt-2" value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} /></label></div>{error && <p className="mt-4 text-sm text-red-300">{error}</p>}<div className="mt-6 flex justify-end gap-3"><button className="button-secondary" onClick={onClose}>Cancel</button><button className="button-primary" disabled={submitting} onClick={() => void submit()}>{submitting ? 'Evaluating…' : 'Evaluate policy'}</button></div></div></div>; }
