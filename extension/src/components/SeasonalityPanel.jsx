import { useEffect, useMemo, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { classifySeasonality, monthLabels } from '../services/estimators/seasonality.js';
import { MSG, send } from '../utils/messaging.js';
import { useAppStore } from '../store/useAppStore.js';
import { Loading } from './ui.jsx';

function LineChart({ labels, data, label }) {
  const ref = useRef(null);
  useEffect(() => {
    const dark = document.documentElement.classList.contains('dark');
    const grid = dark ? 'rgba(148,163,184,.2)' : 'rgba(100,116,139,.2)';
    const txt = dark ? '#cbd5e1' : '#475569';
    const chart = new Chart(ref.current, {
      type: 'line',
      data: { labels, datasets: [{ label, data, borderColor: '#D4AF37', backgroundColor: 'rgba(212,175,55,.16)', fill: true, tension: 0.35, pointRadius: data.length > 24 ? 0 : 3, borderWidth: 2 }] },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { display: false } },
        scales: { y: { min: 0, max: 100, grid: { color: grid }, ticks: { color: txt } }, x: { grid: { display: false }, ticks: { color: txt, maxTicksLimit: 12 } } },
      },
    });
    return () => chart.destroy();
  }, [labels, data, label]);
  return <div className="h-44"><canvas ref={ref} role="img" aria-label={label} /></div>;
}

const TYPE_STYLE = { 'year-round': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300', seasonal: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300', fad: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', unknown: 'bg-slate-100 text-slate-600' };

export default function SeasonalityPanel({ product }) {
  const country = useAppStore((s) => s.filters.country);
  const [series, setSeries] = useState(product.series || null);
  const [state, setState] = useState(product.series ? 'ready' : 'loading');
  const [error, setError] = useState('');
  const [range, setRange] = useState('12m');

  useEffect(() => {
    if (series) return;
    let cancelled = false;
    send(MSG.GET_INTEREST, { product: { id: product.id, title: product.title, trendScore: product.trendScore }, country })
      .then((r) => { if (!cancelled) { setSeries(r.series); setState('ready'); } })
      .catch((e) => { if (!cancelled) { setError(e.message); setState('error'); } });
    return () => { cancelled = true; };
  }, [series, product.id, product.title, product.trendScore, country]);

  const info = useMemo(() => (series ? classifySeasonality(series) : null), [series]);
  const view = useMemo(() => {
    if (!series) return null;
    const n = range === '12m' ? 12 : series.length;
    return { labels: monthLabels(n), data: series.slice(-n) };
  }, [series, range]);

  return (
    <section aria-label="Seasonality">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-semibold">Seasonality {info && <span className={`badge ${TYPE_STYLE[info.type]}`}>{info.label}</span>}</h3>
        <div className="inline-flex overflow-hidden rounded-lg border border-slate-300 dark:border-slate-600" role="group" aria-label="Chart range">
          {[['12m', '12 months'], ['5y', '5 years']].map(([k, l]) => (
            <button key={k} className={`px-2 py-1 text-xs ${range === k ? 'bg-indigo-500 font-semibold text-black' : 'bg-white dark:bg-slate-800'}`} aria-pressed={range === k} onClick={() => setRange(k)}>{l}</button>
          ))}
        </div>
      </div>
      {state === 'loading' && <Loading label="Loading interest history…" />}
      {state === 'error' && <p className="text-red-600 dark:text-red-400" role="alert">{error}</p>}
      {state === 'ready' && view && info && (
        <>
          <LineChart labels={view.labels} data={view.data} label={`Search interest, last ${range === '12m' ? '12 months' : '5 years'}`} />
          <div className="mt-2 space-y-1 text-sm">
            <p><b>Best time to launch:</b> {info.launch}</p>
            {info.peakMonths.length > 0 && <p><b>Peak months:</b> {info.peakMonths.join(', ')}</p>}
            <p className="text-xs text-slate-500">CV {info.cv.toFixed(2)} · peak/avg {info.peakRatio.toFixed(1)}× · year-over-year correlation {info.corr == null ? 'n/a' : info.corr.toFixed(2)}</p>
          </div>
        </>
      )}
    </section>
  );
}
