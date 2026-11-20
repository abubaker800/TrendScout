import Gate, { ThemeToggle } from '../components/Gate.jsx';
import TrendingExplorer from '../components/TrendingExplorer.jsx';
import { useChromeStorage } from '../hooks/useChromeStorage.js';

async function openSidePanel() {
  try { const w = await chrome.windows.getCurrent(); await chrome.sidePanel.open({ windowId: w.id }); window.close(); }
  catch { chrome.runtime.openOptionsPage(); }
}

export default function App() {
  return <Gate><Popup /></Gate>;
}
function Popup() {
  const stores = useChromeStorage('stores', []);
  return (
    <div className="flex min-h-[540px] flex-col">
      <header className="ts-header flex items-center justify-between gap-2 px-3 py-2">
        <div className="flex items-center gap-2"><img src="icons/icon48.png" alt="" className="h-7 w-7" /><span className="brand text-base font-extrabold">TrendScout</span></div>
        <div className="flex items-center gap-1">
          <button className="btn btn-ghost px-2" onClick={openSidePanel} title="Open side panel">▤</button>
          <button className="btn btn-primary" onClick={() => chrome.runtime.openOptionsPage()}>Dashboard</button>
          <ThemeToggle />
        </div>
      </header>
      <main className="flex-1 p-3"><TrendingExplorer compact /></main>
      <footer className="border-t border-slate-200 px-3 py-2 text-xs text-slate-500 dark:border-slate-700">
        {stores.length ? `Store: ${stores.map((s) => s.label).join(', ')}` : 'No store connected — listing is disabled until you connect one.'}
      </footer>
    </div>
  );
}
