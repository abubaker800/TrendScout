import { useEffect, useState } from 'react';
/** Reactive read of a chrome.storage.local key (stores, audit log...). */
export function useChromeStorage(key, fallback) {
  const [value, setValue] = useState(fallback);
  useEffect(() => {
    let live = true;
    chrome.storage.local.get(key).then((o) => { if (live && o[key] !== undefined) setValue(o[key]); });
    const onChange = (changes, area) => { if (area === 'local' && changes[key]) setValue(changes[key].newValue ?? fallback); };
    chrome.storage.onChanged.addListener(onChange);
    return () => { live = false; chrome.storage.onChanged.removeListener(onChange); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return value;
}
