import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useChromeStorage } from '../hooks/useChromeStorage.js';
import { MSG, send } from '../utils/messaging.js';
import { fmtMoney } from '../utils/format.js';
import { Field, Modal, Spinner, Thumb } from './ui.jsx';

/**
 * Owner-permission gate. EVERY listing goes through this modal:
 *  - shows exactly what will be created, in which store, with editable fields
 *  - "Allow & List" requests a one-time, 5-minute confirmation token from the service worker,
 *    which is consumed by the listing call (so a listing can never happen without a fresh confirmation).
 *  - bulk = one explicit confirmation showing the full item list.
 */
export default function ListingModal({ items, onClose }) {
  const defaultStatus = useAppStore((s) => s.settings.defaultListingStatus);
  const stores = useChromeStorage('stores', []);
  const [storeId, setStoreId] = useState('');
  const [status, setStatus] = useState(defaultStatus);
  const [ack, setAck] = useState(false);
  const [phase, setPhase] = useState('review'); // review | working | done
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState(() => items.map((p) => ({
    id: p.id, image: p.image, currency: p.currency, title: p.title, price: p.price ?? '',
    description: `${p.title}\n\nCategory: ${p.category}`, tags: `${p.category}, trending`, category: p.category, sourceUrl: p.link,
  })));

  useEffect(() => { if (!storeId && stores.length) setStoreId(stores[0].id); }, [stores, storeId]);
  const store = stores.find((s) => s.id === storeId);
  const update = (i, patch) => setDrafts((d) => d.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const valid = drafts.every((d) => d.title.trim() && Number.isFinite(Number(d.price)) && d.price !== '' && Number(d.price) >= 0);
  const bulk = drafts.length > 1;

  async function allow() {
    setPhase('working'); setError('');
    try {
      const nonce = await send(MSG.REQUEST_CONFIRMATION, { count: drafts.length });
      const res = await send(MSG.LIST_PRODUCTS, { storeId, status, nonce, items: drafts.map(({ image, currency, ...d }) => ({ ...d, price: Number(d.price) })) });
      setResults(res); setPhase('done');
    } catch (e) { setError(e.message); setPhase('review'); }
  }

  if (phase === 'done') {
    return (
      <Modal title="Listing result" onClose={onClose}>
        <ul className="space-y-2">
          {results.map((r, i) => (
            <li key={i} className={`rounded-lg border p-2 ${r.ok ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40' : 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/40'}`}>
              <b>{r.ok ? '✓ Created' : '✗ Failed'}:</b> {r.title}{r.ok && <span className="ml-1 text-slate-500">({status === 'draft' ? 'draft' : 'active'}{r.remoteId ? ` · id ${r.remoteId}` : ''})</span>}
              {!r.ok && <div className="text-xs">{r.error}</div>}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-500">Recorded in the audit log (Stores &amp; Permissions).</p>
        <div className="mt-4 flex justify-end"><button className="btn btn-primary" onClick={onClose}>Done</button></div>
      </Modal>
    );
  }

  return (
    <Modal title={bulk ? `Confirm listing ${drafts.length} products` : 'Confirm listing'} onClose={phase === 'working' ? undefined : onClose} wide>
      {!stores.length ? (
        <div className="space-y-3">
          <p>No store is connected yet. Connect one (or the local Demo store) under <b>Stores &amp; Permissions</b> to list products.</p>
          <div className="flex justify-end gap-2">
            <button className="btn btn-ghost" onClick={onClose}>Close</button>
            <button className="btn btn-primary" onClick={() => { chrome.tabs?.create ? chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html#stores') }) : window.open(chrome.runtime.getURL('dashboard.html#stores')); onClose(); }}>Open Stores &amp; Permissions</button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Target store">
              <select className="input" value={storeId} onChange={(e) => setStoreId(e.target.value)}>
                {stores.map((s) => <option key={s.id} value={s.id}>{s.label} ({s.platform})</option>)}
              </select>
            </Field>
            <Field label="Create as">
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="draft">Draft (recommended — not visible to customers)</option>
                <option value="active">Active (published immediately)</option>
              </select>
            </Field>
          </div>

          <ul className="max-h-[45vh] space-y-3 overflow-y-auto pr-1">
            {drafts.map((d, i) => (
              <li key={d.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <div className="flex gap-3">
                  <Thumb src={d.image} title={d.title} size="h-14 w-14" />
                  <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[1fr_8rem]">
                    <Field label="Title"><input className="input" maxLength={255} value={d.title} onChange={(e) => update(i, { title: e.target.value })} /></Field>
                    <Field label={`Price (${d.currency})`}><input className="input" type="number" min="0" step="0.01" value={d.price} onChange={(e) => update(i, { price: e.target.value })} /></Field>
                  </div>
                </div>
                <details className="mt-2" open={!bulk}>
                  <summary className="cursor-pointer text-xs text-slate-500">Description &amp; tags</summary>
                  <div className="mt-2 grid gap-2">
                    <Field label="Description"><textarea className="input min-h-[5rem]" maxLength={5000} value={d.description} onChange={(e) => update(i, { description: e.target.value })} /></Field>
                    <Field label="Tags (comma-separated)"><input className="input" value={d.tags} onChange={(e) => update(i, { tags: e.target.value })} /></Field>
                  </div>
                </details>
              </li>
            ))}
          </ul>

          <div className="rounded-lg bg-slate-100 p-3 text-xs dark:bg-slate-900/50">
            <b>Summary:</b> {drafts.length} product{bulk ? 's' : ''} will be created in <b>{store?.label}</b> as <b>{status}</b>
            {valid && <> · total list value {fmtMoney(drafts.reduce((s, d) => s + Number(d.price), 0), drafts[0].currency)}</>}. Nothing is sent until you press the button below.
          </div>
          <label className="flex items-start gap-2">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-indigo-600" checked={ack} onChange={(e) => setAck(e.target.checked)} />
            <span>I own or am authorized to manage <b>{store?.label}</b>, and I allow TrendScout to create {bulk ? 'these products' : 'this product'} now. I am responsible for the product, its claims and trademarks.</span>
          </label>
          {error && <p role="alert" className="rounded-lg bg-red-50 p-2 text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
          <div className="flex justify-end gap-2">
            <button className="btn btn-ghost" onClick={onClose} disabled={phase === 'working'}>Cancel</button>
            <button className="btn btn-primary" onClick={allow} disabled={!store || !ack || !valid || phase === 'working'}>
              {phase === 'working' ? <><Spinner className="h-4 w-4" /> Listing…</> : bulk ? `Allow & List (${drafts.length})` : 'Allow & List'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
