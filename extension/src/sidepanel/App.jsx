import { useState } from 'react';
import Gate, { ThemeToggle } from '../components/Gate.jsx';
import TrendingExplorer from '../components/TrendingExplorer.jsx';
import WatchlistPanel from '../components/WatchlistPanel.jsx';

export default function App() {
  return <Gate><Panel /></Gate>;
}
function Panel() {
  const [tab, setTab] = useState('trending');
  return (
    <div className="min-h-screen">
      <header className="ts-header flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2"><img src="icons/icon48.png" alt="" className="h-7 w-7" /><span className="brand text-base font-extrabold">TrendScout</span></div>
        <div className="flex items-center gap-1">
          {[['trending', 'Trending'], ['watchlist', '★ Watchlist']].map(([k, l]) => (
            <button key={k} className={`btn ${tab === k ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab(k)} aria-pressed={tab === k}>{l}</button>
          ))}
          <button className="btn btn-ghost px-2" onClick={() => chrome.runtime.openOptionsPage()} title="Open full dashboard">⤢</button>
          <ThemeToggle />
        </div>
      </header>
      <main className="p-3">{tab === 'trending' ? <TrendingExplorer compact /> : <WatchlistPanel />}</main>
    </div>
  );
}
