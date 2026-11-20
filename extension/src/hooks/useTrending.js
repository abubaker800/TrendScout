import { useEffect, useState } from 'react';
import { MSG, send } from '../utils/messaging.js';

export function useTrending(country, category, mode) {
  const [state, setState] = useState({ status: 'loading', products: [], warnings: [], error: null });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, status: 'loading', error: null }));
    send(MSG.GET_TRENDING, { country, category, force: tick > 0 })
      .then((r) => { if (!cancelled) setState({ status: r.products.length ? 'ready' : 'empty', products: r.products, warnings: r.warnings || [], error: null }); })
      .catch((e) => { if (!cancelled) setState({ status: 'error', products: [], warnings: [], error: e.message }); });
    return () => { cancelled = true; };
  }, [country, category, mode, tick]);
  return { ...state, reload: () => setTick((t) => t + 1) };
}
