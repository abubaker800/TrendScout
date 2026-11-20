import { BaseProvider } from './base.js';
import { fetchJson } from '../../utils/http.js';

/**
 * Base class for live providers: all third-party API calls go through the user's own proxy server
 * (/server) so vendor keys can live in server/.env instead of the extension bundle.
 * Optionally a user-supplied key (Settings) is forwarded in the X-Provider-Key header to that server.
 */
export class ProxyProvider extends BaseProvider {
  async call(action, ctx, query = {}) {
    const base = String(ctx.settings.serverUrl || '').replace(/\/+$/, '');
    if (!/^https?:\/\//.test(base)) throw new Error('Set a valid server URL in Settings.');
    const url = new URL(`${base}/api/providers/${this.id}/${action}`);
    for (const [k, v] of Object.entries(query)) if (v != null && v !== '') url.searchParams.set(k, String(v));
    const key = ctx.settings.apiKeys?.[this.id];
    return fetchJson(url.toString(), { headers: key ? { 'X-Provider-Key': key } : {}, retries: 2 });
  }
}
