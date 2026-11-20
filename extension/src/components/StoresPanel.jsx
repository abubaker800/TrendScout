import { useState } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useChromeStorage } from '../hooks/useChromeStorage.js';
import { MSG, send } from '../utils/messaging.js';
import { fmtDateTime } from '../utils/format.js';
import { downloadCsv, toCsv } from '../utils/csv.js';
import { Field, Spinner } from './ui.jsx';

const PLATFORMS = {
  shopify: { label: 'Shopify', placeholder: 'my-store.myshopify.com', scopes: 'read_products, write_products', hint: 'You will be redirected to Shopify to approve access.' },
  woocommerce: { label: 'WooCommerce', placeholder: 'https://my-store.com', scopes: 'write (products)', hint: 'Requires an HTTPS store. You approve the API key in WordPress.' },
  demo: { label: 'Demo store (local only)', placeholder: '', scopes: 'demo:write_products', hint: 'Simulates a store so you can test the permission flow. Nothing leaves your browser.' },
};

export default function StoresPanel() {
  const stores = useChromeStorage('stores', []);
  const audit = useChromeStorage('audit', []);
  const settings = useAppStore((s) => s.settings);
  const [platform, setPlatform] = useState('demo');
  const [domain, setDomain] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [wipeStep, setWipeStep] = useState(0);
  const [typed, setTyped] = useState('');
  const P = PLATFORMS[platform];

  async function connect() {
    setBusy(true); setMsg(null);
    try { const s = await send(MSG.CONNECT_STORE, { platform, domain }); setMsg({ ok: true, text: `Connected ${s.label}.` }); setDomain(''); }
    catch (e) { setMsg({ ok: false, text: e.message }); }
    setBusy(false);
  }
  async function disconnect(s) {
    if (!window.confirm(`Disconnect ${s.label}? Access will be revoked and the stored token deleted.`)) return;
    try { await send(MSG.DISCONNECT_STORE, { storeId: s.id }); } catch (e) { setMsg({ ok: false, text: e.message }); }
  }
  async function wipe() {
    setBusy(true);
    try {
      const r = await send(MSG.REVOKE_ALL);
      if (r.failed?.length) window.alert(`Local data was deleted, but the server could not be reached to revoke: ${r.failed.join(', ')}. Remove TrendScout from those stores' admin pages to be sure.`);
      await useAppStore.persist.clearStorage();
      location.reload();
    }
    catch (e) { setMsg({ ok: false, text: e.message }); setBusy(false); }
  }
  const exportAudit = () => downloadCsv('trendscout-audit-log.csv', toCsv(audit, [
    { label: 'Time', key: 'ts' }, { label: 'Action', key: 'action' }, { label: 'Store', key: 'storeLabel' }, { label: 'Platform', key: 'platform' },
    { label: 'Product', key: 'title' }, { label: 'Price', key: 'price' }, { label: 'Status', key: 'status' }, { label: 'Result', key: 'result' }, { label: 'Remote ID', key: 'remoteId' }, { label: 'By', key: 'actor' }, { label: 'Error', key: 'error' },
  ]));

  return (
    <div className="space-y-5">
      <section className="card space-y-3">
        <h2 className="text-base font-semibold">Connect a store</h2>
        <p className="text-slate-500 dark:text-slate-400">TrendScout only requests the minimum scopes and never stores your access token in the browser. Nothing is listed until you confirm each action.</p>
        <div className="grid gap-3 sm:grid-cols-[12rem_1fr_auto]">
          <Field label="Platform"><select className="input" value={platform} onChange={(e) => { setPlatform(e.target.value); setMsg(null); }}>{Object.entries(PLATFORMS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
          {platform !== 'demo' ? <Field label="Store address"><input className="input" value={domain} placeholder={P.placeholder} onChange={(e) => setDomain(e.target.value)} /></Field> : <div />}
          <div className="flex items-end"><button className="btn btn-primary w-full" onClick={connect} disabled={busy || (platform !== 'demo' && !domain.trim())}>{busy ? <Spinner className="h-4 w-4" /> : 'Connect'}</button></div>
        </div>
        <p className="text-xs text-slate-500">Scopes requested: <b>{P.scopes}</b>. {P.hint}{platform !== 'demo' && <> Server: <code>{settings.serverUrl}</code></>}</p>
        {msg && <p role={msg.ok ? 'status' : 'alert'} className={msg.ok ? 'text-emerald-600' : 'text-red-600 dark:text-red-400'}>{msg.text}</p>}
      </section>

      <section className="card space-y-3">
        <h2 className="text-base font-semibold">Connected stores &amp; granted scopes</h2>
        {!stores.length ? <p className="text-slate-500">No stores connected.</p> : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-700">
            {stores.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div>
                  <div className="font-medium">{s.label} <span className="badge bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200">{s.platform}</span></div>
                  <div className="text-xs text-slate-500">Scopes: {s.scopes.join(', ') || '—'} · connected {fmtDateTime(s.connectedAt)}</div>
                </div>
                <button className="btn btn-ghost" onClick={() => disconnect(s)}>Disconnect</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card space-y-3">
        <div className="flex items-center justify-between"><h2 className="text-base font-semibold">Audit log</h2><button className="btn btn-ghost" disabled={!audit.length} onClick={exportAudit}>Export CSV</button></div>
        {!audit.length ? <p className="text-slate-500">Nothing has been listed yet. Every connect, list and revoke action appears here.</p> : (
          <div className="max-h-96 overflow-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="sticky top-0 bg-white dark:bg-slate-800"><tr><th className="th">When</th><th className="th">Action</th><th className="th">Store</th><th className="th">Product</th><th className="th">Result</th><th className="th">By</th></tr></thead>
              <tbody>
                {audit.map((a) => (
                  <tr key={a.id} className="border-t border-slate-200 dark:border-slate-700">
                    <td className="whitespace-nowrap px-3 py-1.5">{fmtDateTime(a.ts)}</td><td className="px-3">{a.action}</td><td className="px-3">{a.storeLabel}</td>
                    <td className="px-3">{a.title || '—'}{a.status ? ` (${a.status})` : ''}</td>
                    <td className={`px-3 ${a.result === 'failed' ? 'text-red-600' : 'text-emerald-600'}`}>{a.result}{a.error ? `: ${a.error}` : ''}</td><td className="px-3">{a.actor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card space-y-3 border-red-300 dark:border-red-900">
        <h2 className="text-base font-semibold text-red-700 dark:text-red-300">Revoke access &amp; delete data</h2>
        <p>Disconnects every store (deleting server-side tokens), then erases all TrendScout data in this browser: settings, watchlist, calculator inputs, cache and the audit log. Export the audit log first if you need it.</p>
        {wipeStep === 0 ? <button className="btn btn-danger" onClick={() => setWipeStep(1)}>Revoke access &amp; delete data…</button> : (
          <div className="flex flex-wrap items-end gap-2">
            <Field label='Type DELETE to confirm'><input className="input" value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus /></Field>
            <button className="btn btn-danger" disabled={typed !== 'DELETE' || busy} onClick={wipe}>{busy ? <Spinner className="h-4 w-4" /> : 'Permanently revoke & delete'}</button>
            <button className="btn btn-ghost" onClick={() => { setWipeStep(0); setTyped(''); }}>Cancel</button>
          </div>
        )}
      </section>
    </div>
  );
}
