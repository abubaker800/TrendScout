import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { CATEGORIES, COUNTRY_CODES, SEASONALITY_OPTIONS, countryName } from '../utils/constants.js';
import { AD_FILTERS, SORT_OPTIONS } from '../utils/filtering.js';
import { Field } from './ui.jsx';

export default function Filters({ compact = false }) {
  const f = useAppStore((s) => s.filters);
  const set = useAppStore((s) => s.setFilters);
  const reset = useAppStore((s) => s.resetFilters);
  const countries = useMemo(() => COUNTRY_CODES.map((c) => ({ c, n: countryName(c) })).sort((a, b) => a.n.localeCompare(b.n)), []);
  return (
    <div className={`grid gap-2 ${compact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4 xl:grid-cols-6'}`}>
      <Field label="Country">
        <select className="input" value={f.country} onChange={(e) => set({ country: e.target.value })}>
          {countries.map(({ c, n }) => <option key={c} value={c}>{n}</option>)}
        </select>
      </Field>
      <Field label="Category">
        <select className="input" value={f.category} onChange={(e) => set({ category: e.target.value })}>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="Search" className={compact ? '' : 'md:col-span-2'}>
        <input className="input" type="search" placeholder="Search title, category, source…" value={f.search} onChange={(e) => set({ search: e.target.value })} />
      </Field>
      <Field label="Sort by">
        <select className="input" value={f.sort} onChange={(e) => set({ sort: e.target.value })}>
          {SORT_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </Field>
      {!compact && (
        <>
          <Field label="Price min"><input className="input" type="number" min="0" value={f.priceMin} onChange={(e) => set({ priceMin: e.target.value })} /></Field>
          <Field label="Price max"><input className="input" type="number" min="0" value={f.priceMax} onChange={(e) => set({ priceMax: e.target.value })} /></Field>
          <Field label={`Min trend score: ${f.minScore}`}>
            <input className="w-full accent-indigo-600" type="range" min="0" max="100" step="5" value={f.minScore} onChange={(e) => set({ minScore: Number(e.target.value) })} />
          </Field>
          <Field label="Ad status">
            <select className="input" value={f.ad} onChange={(e) => set({ ad: e.target.value })}>{AD_FILTERS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select>
          </Field>
          <Field label="Seasonality">
            <select className="input" value={f.seasonality} onChange={(e) => set({ seasonality: e.target.value })}>{SEASONALITY_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select>
          </Field>
          <div className="flex items-end"><button className="btn btn-ghost w-full" onClick={reset}>Reset filters</button></div>
        </>
      )}
    </div>
  );
}
