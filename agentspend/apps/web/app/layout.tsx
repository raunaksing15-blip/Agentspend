
import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'AgentSpend — Financial Firewall for AI Agents',
  description: 'A security control plane for autonomous agent payments.'
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
