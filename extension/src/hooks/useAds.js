import { useEffect, useRef, useState } from 'react';
import { MSG, send } from '../utils/messaging.js';

const UNKNOWN = { facebook: { status: 'unknown' }, tiktok: { status: 'unknown' }, pinterest: { status: 'unknown' } };
const minimal = (p) => ({ id: p.id, title: p.title, price: p.price, trendScore: p.trendScore });

/** Lazily loads ad status (cached in the service worker) for the products currently needed. */
export function useAds(products, country, mode) {
  const [map, setMap] = useState({});
  const inflight = useRef(new Set());
  useEffect(() => { setMap({}); }, [country, mode]);
  const key = products.map((p) => p.id).join('|');
  useEffect(() => {
    const need = products.filter((p) => !map[p.id] && !inflight.current.has(p.id));
    if (!need.length) return undefined;
    let cancelled = false;
    (async () => {
      for (let i = 0; i < need.length && !cancelled; i += 15) {
        const chunk = need.slice(i, i + 15);
        chunk.forEach((p) => inflight.current.add(p.id));
        try {
          const r = await send(MSG.GET_ADS_BATCH, { products: chunk.map(minimal), country });
          if (!cancelled) setMap((m) => ({ ...m, ...r }));
        } catch {
          if (!cancelled) setMap((m) => ({ ...m, ...Object.fromEntries(chunk.map((p) => [p.id, UNKNOWN])) }));
        } finally { chunk.forEach((p) => inflight.current.delete(p.id)); }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, country, mode]);
  return map;
}
