// TTL cache on chrome.storage.local. Keys are prefixed so a purge never touches app data.
const PREFIX = 'cache:';
export async function cacheGet(key) {
  const k = PREFIX + key;
  const o = await chrome.storage.local.get(k);
  const e = o[k];
  if (!e) return null;
  if (Date.now() > e.exp) { await chrome.storage.local.remove(k); return null; }
  return e.v;
}
export async function cacheSet(key, value, ttlMs) {
  await chrome.storage.local.set({ [PREFIX + key]: { v: value, exp: Date.now() + ttlMs } });
}
export async function cachePurge(all = false) {
  const items = await chrome.storage.local.get(null);
  const doomed = Object.keys(items).filter((k) => k.startsWith(PREFIX) && (all || Date.now() > items[k]?.exp));
  if (doomed.length) await chrome.storage.local.remove(doomed);
  return doomed.length;
}
