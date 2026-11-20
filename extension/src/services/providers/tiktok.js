import { ProxyProvider } from './proxy.js';
import { adLinks, cleanAd } from './base.js';
import { sanitizeProduct } from '../../utils/sanitize.js';

export class TikTokProvider extends ProxyProvider {
  constructor() { super('tiktok', 'TikTok Creative Center', { trending: true, ads: ['tiktok'] }); }
  async getTrending({ country, category }, ctx) {
    const j = await this.call('trending', ctx, { country, category });
    return (j.items || []).map((i) => sanitizeProduct({ ...i, source: 'TikTok Shop', country, category: i.category || category }));
  }
  async getAdStatus(product, ctx) {
    const j = await this.call('ads', ctx, { q: product.title, country: ctx.country });
    return { tiktok: cleanAd(j, adLinks(product.title, ctx.country).tiktok) };
  }
}
