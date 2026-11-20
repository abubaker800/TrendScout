import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useTrending } from '../hooks/useTrending.js';
import { useAds } from '../hooks/useAds.js';
import { adPass, enrichProduct, filterAndSort } from '../utils/filtering.js';
import { activePlatforms, fmtInt } from '../utils/format.js';
import { downloadCsv, toCsv } from '../utils/csv.js';
import Filters from './Filters.jsx';
import ListingModal from './ListingModal.jsx';
import { ProductCard, ProductRow } from './ProductRow.jsx';
import { EmptyState, ErrorState, Loading } from './ui.jsx';

export const CSV_COLUMNS = (ads = {}) => [
  { label: 'Title', key: 'title' }, { label: 'Price', key: 'price' }, { label: 'Currency', key: 'currency' }, { label: 'Category', key: 'category' },
  { label: 'Trend score', key: 'trendScore' }, { label: 'Est. sales (low)', get: (p) => p.est?.low }, { label: 'Est. sales (expected)', get: (p) => p.est?.expected },
  { label: 'Est. sales (high)', get: (p) => p.est?.high }, { label: 'Confidence', get: (p) => p.est?.confidence }, { label: 'Seasonality', get: (p) => p.season?.label },
  { label: 'Active ad platforms', get: (p) => activePlatforms(ads[p.id]).join('|') }, { label: 'Source', key: 'source' }, { label: 'Link', key: 'link' },
];

const SortTh = ({ label, sortId, altId, current, onSort }) => (
  <th className="th" aria-sort={current === sortId || current === altId ? 'descending' : 'none'}>
    {onSort ? <button className="uppercase tracking-wide hover:text-indigo-600" onClick={() => onSort(sortId, altId)}>{label}{current === sortId || current === altId ? ' ↓' : ''}</button> : label}
  </th>
);

export default function TrendingExplorer({ compact = false }) {
  const filters = useAppStore((s) => s.filters);
  const setFilters = useAppStore((s) => s.setFilters);
  const resetFilters = useAppStore((s) => s.resetFilters);
  const settings = useAppStore((s) => s.settings);
  const watchlist = useAppStore((s) => s.watchlist);
  const toggleWatch = useAppStore((s) => s.toggleWatch);
  const { status, products, warnings, error, reload } = useTrending(filters.country, filters.category, settings.dataMode);

  const pageSize = compact ? 6 : 10;
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(null);
  const [selected, setSelected] = useState(() => new Set());
  const [listing, setListing] = useState(null);

  const enriched = useMemo(() => products.map((p) => enrichProduct(p, settings.assumptions)), [products, settings.assumptions]);
  const adNeeded = filters.ad !== 'any';
  const preAd = useMemo(() => filterAndSort(enriched, filters), [enriched, filters]);
  const adMap = useAds(adNeeded ? preAd : preAd.slice(page * pageSize, page * pageSize + pageSize), filters.country, settings.dataMode);
  const list = useMemo(() => (adNeeded ? preAd.filter((p) => adPass(adMap[p.id], filters.ad)) : preAd), [preAd, adMap, adNeeded, filters.ad]);

  useEffect(() => { setPage(0); setOpen(null); }, [filters]);
  const pages = Math.max(1, Math.ceil(list.length / pageSize));
  const cur = Math.min(page, pages - 1);
  const rows = list.slice(cur * pageSize, cur * pageSize + pageSize);
  const selectedItems = list.filter((p) => selected.has(p.id));
  const toggleSel = (id) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const sortBy = (id, alt) => setFilters({ sort: filters.sort === id && alt ? alt : id });

  const exportCsv = () => downloadCsv(`trendscout-${filters.country}-${filters.category}.csv`.replace(/\s+/g, '_'), toCsv(list, CSV_COLUMNS(adMap)));

  return (
    <div className="space-y-3">
      <Filters compact={compact} />
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span>
          {status === 'ready' && <>{fmtInt(list.length)} of {fmtInt(products.length)} products · </>}
          <span className={`badge ${settings.dataMode === 'live' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300'}`}>{settings.dataMode === 'live' ? 'Live data' : 'Demo data'}</span>
          {settings.dataMode !== 'live' && !compact && <span className="ml-2">Add API keys &amp; switch to live data in Settings.</span>}
        </span>
        <span className="flex flex-wrap items-center gap-2">
          {!compact && selectedItems.length > 0 && <button className="btn btn-primary" onClick={() => setListing(selectedItems)}>List {selectedItems.length} selected…</button>}
          <button className="btn btn-ghost" onClick={exportCsv} disabled={!list.length}>Export CSV</button>
          <button className="btn btn-ghost" onClick={reload} disabled={status === 'loading'}>↻ Refresh</button>
        </span>
      </div>
      {warnings.map((w) => <div key={w} className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200" role="status">⚠ {w}</div>)}

      {status === 'loading' && <Loading label="Finding trending products…" />}
      {status === 'error' && <ErrorState message={error} onRetry={reload} />}
      {status === 'empty' && <EmptyState title="No products found" hint="Try another country or category." />}
      {status === 'ready' && !list.length && <EmptyState title="No products match your filters" hint="Loosen the price, score, ad or seasonality filters."><button className="btn btn-ghost" onClick={resetFilters}>Reset filters</button></EmptyState>}

      {status === 'ready' && list.length > 0 && (compact ? (
        <div className="space-y-2">
          {rows.map((p) => (
            <ProductCard key={p.id} p={p} ads={adMap[p.id]} watched={!!watchlist[p.id]} onWatch={() => toggleWatch(p)} onList={() => setListing([p])} expanded={open === p.id} onToggle={() => setOpen(open === p.id ? null : p.id)} />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <table className="w-full min-w-[980px] text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/40">
              <tr>
                <th className="th w-8"><input type="checkbox" className="h-4 w-4 accent-indigo-600" aria-label="Select all on this page" checked={rows.length > 0 && rows.every((p) => selected.has(p.id))}
                  onChange={(e) => setSelected((s) => { const n = new Set(s); rows.forEach((p) => (e.target.checked ? n.add(p.id) : n.delete(p.id))); return n; })} /></th>
                <SortTh label="Product" sortId="title" current={filters.sort} onSort={sortBy} />
                <SortTh label="Price" sortId="price_asc" altId="price_desc" current={filters.sort} onSort={sortBy} />
                <SortTh label="Category" current={filters.sort} />
                <SortTh label="Trend" sortId="hottest" current={filters.sort} onSort={sortBy} />
                <SortTh label="Est. sales / mo" sortId="sales" current={filters.sort} onSort={sortBy} />
                <SortTh label="Ads" current={filters.sort} />
                <SortTh label="Source" current={filters.sort} />
                <th className="th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <ProductRow key={p.id} p={p} ads={adMap[p.id]} watched={!!watchlist[p.id]} onWatch={() => toggleWatch(p)} onList={() => setListing([p])}
                  selected={selected.has(p.id)} onSelect={() => toggleSel(p.id)} expanded={open === p.id} onToggle={() => setOpen(open === p.id ? null : p.id)} colSpan={9} />
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {status === 'ready' && pages > 1 && (
        <nav className="flex items-center justify-center gap-3" aria-label="Pagination">
          <button className="btn btn-ghost" disabled={cur === 0} onClick={() => setPage(cur - 1)}>← Prev</button>
          <span className="text-xs">Page {cur + 1} of {pages}</span>
          <button className="btn btn-ghost" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>Next →</button>
        </nav>
      )}
      <p className="text-center text-[11px] text-slate-500">Sales, profit and trend figures are approximations, not guarantees. Verify before you invest.</p>
      {listing && <ListingModal items={listing} onClose={() => { setListing(null); setSelected(new Set()); }} />}
    </div>
  );
}
