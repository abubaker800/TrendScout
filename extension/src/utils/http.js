export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export class HttpError extends Error {
  constructor(message, status = 0, retryAfterMs = 0) { super(message); this.name = 'HttpError'; this.status = status; this.retryAfterMs = retryAfterMs; }
}

/** fetch + JSON with timeout, exponential backoff + jitter, and Retry-After handling for 429/5xx. */
export async function fetchJson(url, { method = 'GET', headers = {}, body, retries = 3, timeoutMs = 15000, baseDelay = 600 } = {}) {
  for (let attempt = 0; ; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (res.ok) return await res.json();
      let msg = `HTTP ${res.status}`;
      try { const j = await res.json(); if (j?.error) msg = String(j.error).slice(0, 240); } catch { /* non-JSON error body */ }
      const retryAfterMs = (Number(res.headers.get('retry-after')) || 0) * 1000;
      const retryable = res.status === 429 || res.status >= 500;
      if (!retryable || attempt >= retries || res.status === 501) throw new HttpError(msg, res.status, retryAfterMs);
      await sleep(Math.min(retryAfterMs || baseDelay * 2 ** attempt + Math.random() * 250, 15000));
    } catch (e) {
      clearTimeout(timer);
      if (e instanceof HttpError) throw e;
      if (attempt >= retries) throw new HttpError(e?.name === 'AbortError' ? 'Request timed out' : 'Network error — is the server running?', 0);
      await sleep(baseDelay * 2 ** attempt + Math.random() * 250);
    }
  }
}
