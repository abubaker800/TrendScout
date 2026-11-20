import { useEffect, useState } from 'react';

export const Spinner = ({ className = '' }) => (
  <div role="status" aria-label="Loading" className={`h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent ${className}`} />
);
export const Loading = ({ label = 'Loading…' }) => (
  <div className="flex items-center justify-center gap-2 p-8 text-slate-500 dark:text-slate-400"><Spinner />{label}</div>
);
export function EmptyState({ title, hint, children }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-600">
      <div className="text-2xl" aria-hidden>🔎</div>
      <div className="font-semibold">{title}</div>
      {hint && <div className="max-w-sm text-slate-500 dark:text-slate-400">{hint}</div>}
      {children}
    </div>
  );
}
export function ErrorState({ message, onRetry }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-2 rounded-xl border border-red-300 bg-red-50 p-6 text-center text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
      <div className="font-semibold">Something went wrong</div>
      <div className="max-w-md break-words">{message}</div>
      {onRetry && <button className="btn btn-ghost mt-1" onClick={onRetry}>Try again</button>}
    </div>
  );
}
export function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-3" role="dialog" aria-modal="true" aria-label={title}
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`my-4 w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-800`}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="text-base font-semibold">{title}</h2>
          <button className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Close" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
export const Field = ({ label, hint, children, className = '' }) => (
  <label className={`block ${className}`}>
    <span className="label">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{hint}</span>}
  </label>
);
export const Tip = ({ text }) => (
  <span className="group relative inline-block align-middle">
    <span tabIndex={0} className="ml-1 inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600 dark:bg-slate-600 dark:text-slate-100" aria-label={text}>i</span>
    <span role="tooltip" className="pointer-events-none absolute left-1/2 top-5 z-30 hidden w-72 -translate-x-1/2 rounded-lg bg-slate-900 p-2 text-xs font-normal normal-case leading-snug text-white shadow-lg group-focus-within:block group-hover:block">{text}</span>
  </span>
);
export function ScoreBar({ value }) {
  const c = value >= 70 ? 'bg-emerald-500' : value >= 40 ? 'bg-amber-500' : 'bg-slate-400';
  return (
    <div className="flex items-center gap-2" title={`Trend score ${value}/100`}>
      <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><div className={`h-full ${c}`} style={{ width: `${value}%` }} /></div>
      <span className="w-6 text-xs tabular-nums">{value}</span>
    </div>
  );
}
export const Toggle = ({ checked, onChange, label }) => (
  <label className="flex cursor-pointer items-center gap-2">
    <input type="checkbox" className="h-4 w-4 rounded accent-indigo-600" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <span>{label}</span>
  </label>
);
export function Thumb({ src, title = '', size = 'h-10 w-10' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (src && !failed) {
    return <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className={`${size} shrink-0 rounded-lg bg-slate-200 object-cover dark:bg-slate-700`} />;
  }
  // fallback: initials box in the black / gold / red / gray palette (never an empty hole)
  const initials = title.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';
  const PAL = [['#D4AF37', '#0B0B0C'], ['#B3141C', '#FFFFFF'], ['#2A2A2E', '#D4AF37'], ['#6B6B72', '#FFFFFF']];
  const [bg, fg] = PAL[[...title].reduce((a, c) => a + c.charCodeAt(0), 0) % PAL.length];
  return <div className={`${size} flex shrink-0 items-center justify-center rounded-lg text-xs font-bold`} style={{ background: bg, color: fg }} aria-hidden>{initials}</div>;
}
