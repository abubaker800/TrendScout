import { useEffect, useState } from 'react';
import Gate, { ThemeToggle } from '../components/Gate.jsx';
import TrendingExplorer from '../components/TrendingExplorer.jsx';
import WatchlistPanel from '../components/WatchlistPanel.jsx';
import StoresPanel from '../components/StoresPanel.jsx';
import SettingsPanel from '../components/SettingsPanel.jsx';
import { useAppStore } from '../store/useAppStore.js';

const TABS = [['trending', '🔥 Trending'], ['watchlist', '★ Watchlist'], ['stores', '🔐 Stores & Permissions'], ['settings', '⚙ Settings']];
const fromHash = () => { const h = location.hash.replace('#', ''); return TABS.some(([k]) => k === h) ? h : 'trending'; };

export default function App() {
  return <Gate><Dashboard /></Gate>;
}
function Dashboard() {
  const [tab, setTab] = useState(fromHash);
  const count = useAppStore((s) => Object.keys(s.watchlist).length);
  useEffect(() => { const on = () => setTab(fromHash()); window.addEventListener('hashchange', on); return () => window.removeEventListener('hashchange', on); }, []);
  const go = (k) => { location.hash = k; setTab(k); };
  return (
    <div className="mx-auto max-w-[1400px]">
      <header className="ts-header flex flex-wrap items-center justify-between gap-3 px-5 py-3">
        <div className="flex items-center gap-3"><img src="icons/icon48.png" alt="" className="h-8 w-8" /><div><h1 className="brand text-xl font-extrabold leading-tight">TrendScout</h1><p className="text-xs text-slate-500">Product research &amp; owner-approved store lister</p></div></div>
        <nav className="flex flex-wrap items-center gap-1" aria-label="Sections">
          {TABS.map(([k, l]) => <button key={k} className={`btn ${tab === k ? 'btn-primary' : 'btn-ghost'}`} aria-current={tab === k ? 'page' : undefined} onClick={() => go(k)}>{l}{k === 'watchlist' && count > 0 ? ` (${count})` : ''}</button>)}
          <ThemeToggle />
        </nav>
      </header>
      <main className="p-5">
        {tab === 'trending' && <TrendingExplorer />}
        {tab === 'watchlist' && <WatchlistPanel />}
        {tab === 'stores' && <StoresPanel />}
        {tab === 'settings' && <SettingsPanel />}
      </main>
      <footer className="px-5 pb-6 text-center text-xs text-slate-500">Estimates are approximations, not guarantees. Respect each marketplace's Terms of Service.</footer>
    </div>
  );
}
