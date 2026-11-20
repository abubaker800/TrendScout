import { useState } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { DEFAULT_ASSUMPTIONS } from '../services/estimators/sales.js';
import { PROVIDER_META } from '../utils/constants.js';
import { MSG, send } from '../utils/messaging.js';
import { Field, Toggle } from './ui.jsx';

const pct = (v) => Math.round(v * 1000) / 10;

export default function SettingsPanel() {
  const settings = useAppStore((s) => s.settings);
  const setSettings = useAppStore((s) => s.setSettings);
  const [ping, setPing] = useState(null);
  const [note, setNote] = useState('');
  const A = settings.assumptions;
  const setA = (patch) => setSettings({ assumptions: { ...A, ...patch } });
  const setRate = (group, key, percent) => { const v = Number(percent) / 100; if (Number.isFinite(v) && v > 0 && v <= 1) setA({ [group]: { ...A[group], [key]: v } }); };

  async function saveServer(url) {
    setSettings({ serverUrl: url.trim() });
    try {
      const u = new URL(url.trim());
      if (u.hostname !== 'localhost' && u.protocol === 'https:') await chrome.permissions.request({ origins: [`${u.origin}/*`] });
    } catch { /* invalid URL — validated again on use */ }
  }
  async function test() {
    setPing('…');
    try { const r = await send(MSG.TEST_SERVER, { url: settings.serverUrl }); setPing(`✓ ${r.name} reachable`); } catch (e) { setPing(`✗ ${e.message}`); }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="card space-y-3">
        <h2 className="text-base font-semibold">Appearance &amp; behaviour</h2>
        <Field label="Theme"><select className="input" value={settings.theme} onChange={(e) => setSettings({ theme: e.target.value })}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></Field>
        <Field label="New listings are created as"><select className="input" value={settings.defaultListingStatus} onChange={(e) => setSettings({ defaultListingStatus: e.target.value })}><option value="draft">Draft (recommended)</option><option value="active">Active</option></select></Field>
        <Toggle checked={settings.pageScanner} onChange={(v) => setSettings({ pageScanner: v })} label="Page scanner overlay on Amazon / AliExpress / Shopify product pages" />
        <Toggle checked={settings.notifications} onChange={(v) => setSettings({ notifications: v })} label="Notify me when a watched product's trend score jumps" />
        <Field label="Background refresh interval (hours)"><input className="input" type="number" min="1" max="48" value={settings.refreshHours} onChange={(e) => setSettings({ refreshHours: Math.min(48, Math.max(1, Number(e.target.value) || 6)) })} /></Field>
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost" onClick={async () => { const n = await send(MSG.PURGE_CACHE); setNote(`Cleared ${n} cached entries.`); }}>Clear cache</button>
          {note && <span className="text-xs text-slate-500" role="status">{note}</span>}
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="text-base font-semibold">Sales estimator assumptions</h2>
        <p className="text-xs text-slate-500">Units = w × (reviews/month ÷ review rate) + (1 − w) × (visits × conversion). Fewer reviewers means more units, so the highest review rate gives the low case.</p>
        <div className="grid grid-cols-3 gap-2">
          {['min', 'mid', 'max'].map((k) => <Field key={`r${k}`} label={`Review rate ${k} %`}><input className="input" type="number" step="0.1" min="0.1" max="100" value={pct(A.reviewRate[k])} onChange={(e) => setRate('reviewRate', k, e.target.value)} /></Field>)}
          {['min', 'mid', 'max'].map((k) => <Field key={`c${k}`} label={`Conversion ${k} %`}><input className="input" type="number" step="0.1" min="0.1" max="100" value={pct(A.conversion[k])} onChange={(e) => setRate('conversion', k, e.target.value)} /></Field>)}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label={`Weight on reviews (w): ${A.reviewWeight}`}><input className="w-full accent-indigo-600" type="range" min="0" max="1" step="0.05" value={A.reviewWeight} onChange={(e) => setA({ reviewWeight: Number(e.target.value) })} /></Field>
          <Field label="Listing age (months)" hint="Used when only total reviews are known."><input className="input" type="number" min="1" max="120" value={A.listingAgeMonths} onChange={(e) => setA({ listingAgeMonths: Math.max(1, Number(e.target.value) || 18) })} /></Field>
        </div>
        <button className="btn btn-ghost" onClick={() => setSettings({ assumptions: DEFAULT_ASSUMPTIONS })}>Reset to defaults</button>
      </section>

      <section className="card space-y-3 lg:col-span-2">
        <h2 className="text-base font-semibold">Data source</h2>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2"><input type="radio" name="mode" className="accent-indigo-600" checked={settings.dataMode === 'mock'} onChange={() => setSettings({ dataMode: 'mock' })} /> Demo data (no API keys, works offline)</label>
          <label className="flex items-center gap-2"><input type="radio" name="mode" className="accent-indigo-600" checked={settings.dataMode === 'live'} onChange={() => setSettings({ dataMode: 'live' })} /> Live data (via your proxy server)</label>
        </div>
        <Toggle checked={settings.demoImages !== false} onChange={async (v) => { setSettings({ demoImages: v }); await send(MSG.PURGE_CACHE); }} label="Demo mode: show product photos (loaded from loremflickr.com; turn off for zero network requests)" />
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <Field label="Proxy server URL" hint="API keys stay in server/.env. See README → “Run the server”."><input className="input" value={settings.serverUrl} onChange={(e) => setSettings({ serverUrl: e.target.value })} onBlur={(e) => saveServer(e.target.value)} /></Field>
          <button className="btn btn-ghost" onClick={test}>Test connection</button>
          {ping && <span className="text-xs" role="status">{ping}</span>}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {PROVIDER_META.map((p) => (
            <div key={p.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
              <Toggle checked={settings.enabledProviders[p.id] !== false} onChange={(v) => setSettings({ enabledProviders: { ...settings.enabledProviders, [p.id]: v } })} label={<b>{p.name}</b>} />
              <p className="my-1 text-xs text-slate-500">{p.note}</p>
              <input className="input" type="password" autoComplete="off" placeholder="Optional: your own API key (sent only to your server)" value={settings.apiKeys[p.id] || ''} onChange={(e) => setSettings({ apiKeys: { ...settings.apiKeys, [p.id]: e.target.value.trim() } })} aria-label={`${p.name} API key`} />
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500">Keys typed here are stored only in this browser profile and forwarded solely to the server URL above. Prefer putting keys in <code>server/.env</code>. Official APIs are used wherever available; otherwise you get a deep link to the public ad library (“Check manually”).</p>
      </section>
    </div>
  );
}
