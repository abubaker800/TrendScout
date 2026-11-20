import { useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useAds } from '../hooks/useAds.js';
import { enrichProduct } from '../utils/filtering.js';
import { downloadCsv, toCsv } from '../utils/csv.js';
import { CSV_COLUMNS } from './TrendingExplorer.jsx';
import ListingModal from './ListingModal.jsx';
import { ProductCard } from './ProductRow.jsx';
import { EmptyState } from './ui.jsx';

export default function WatchlistPanel() {
  const watchlist = useAppStore((s) => s.watchlist);
  const toggleWatch = useAppStore((s) => s.toggleWatch);
  const settings = useAppStore((s) => s.settings);
  const country = useAppStore((s) => s.filters.country);
  const [open, setOpen] = useState(null);
  const [listing, setListing] = useState(null);
  const items = useMemo(() => Object.values(watchlist).sort((a, b) => (b.watchedAt || '').localeCompare(a.watchedAt || '')).map((p) => enrichProduct(p, settings.assumptions)), [watchlist, settings.assumptions]);
  const ads = useAds(items, country, settings.dataMode);

  if (!items.length) return <EmptyState title="Your watchlist is empty" hint="Click ☆ on any product to track it. TrendScout checks watched products in the background and notifies you when their trend score jumps." />;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-slate-500">{items.length} watched product{items.length > 1 ? 's' : ''}</span>
        <button className="btn btn-ghost" onClick={() => downloadCsv('trendscout-watchlist.csv', toCsv(items, CSV_COLUMNS(ads)))}>Export CSV</button>
      </div>
      <div className="grid gap-2 lg:grid-cols-2">
        {items.map((p) => (
          <ProductCard key={p.id} p={p} ads={ads[p.id]} watched onWatch={() => toggleWatch(p)} onList={() => setListing([p])} expanded={open === p.id} onToggle={() => setOpen(open === p.id ? null : p.id)} />
        ))}
      </div>
      {listing && <ListingModal items={listing} onClose={() => setListing(null)} />}
    </div>
  );
}
