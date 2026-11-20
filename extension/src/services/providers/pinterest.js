import { ProxyProvider } from './proxy.js';
import { adLinks, cleanAd } from './base.js';
import { sanitizeProduct } from '../../utils/sanitize.js';

export class PinterestProvider extends ProxyProvider {
  constructor() { super('pinterest', 'Pinterest Trends', { trending: true, ads: ['pinterest'] }); }
  async getTrending({ country, category }, ctx) {
    const j = await this.call('trending', ctx, { country, category });
    return (j.items || []).map((i) => sanitizeProduct({ ...i, source: 'Pinterest', country, category: i.category || category }));
  }
  async getAdStatus(product, ctx) {
    const j = await this.call('ads', ctx, { q: product.title, country: ctx.country });
    return { pinterest: cleanAd(j, adLinks(product.title, ctx.country).pinterest) };
  }
}
