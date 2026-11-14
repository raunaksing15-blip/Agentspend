'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function AuthPage() {
  const [token, setToken] = useState('');
  const save = () => {
    window.sessionStorage.setItem('agentspend-owner-token', token);
    window.location.href = '/dashboard';
  };
  return <main className="grid min-h-screen place-items-center px-6 py-12">
    <div className="w-full max-w-md">
      <Link href="/" className="mb-8 flex items-center gap-3 font-semibold"><span className="grid h-9 w-9 place-items-center rounded-xl bg-as-blue text-slate-950">A</span> AgentSpend</Link>
      <div className="rounded-3xl border border-slate-800 bg-as-panel p-7">
        <p className="eyebrow">Local owner access</p>
        <h1 className="mt-4 text-2xl font-semibold">Sign in to your control plane</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">Use the <code className="text-slate-300">OWNER_API_TOKEN</code> from your local API environment. This token remains in browser session storage.</p>
        <label className="mt-6 block text-xs font-medium text-slate-400">Owner API token<input autoFocus type="password" value={token} onChange={event => setToken(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') save(); }} className="input mt-2" placeholder="OWNER_API_TOKEN" /></label>
        <button className="button-primary mt-5 w-full justify-center" onClick={save}>Continue to dashboard</button>
        <Link href="/" className="mt-5 block text-center text-xs text-slate-500 hover:text-slate-300">Back to overview</Link>
      </div>
      <p className="mt-5 text-center text-xs text-slate-600">Simulation mode only · no funds move</p>
    </div>
  </main>;
}
