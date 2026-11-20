import { ProxyProvider } from './proxy.js';
import { adLinks, cleanAd } from './base.js';

export class MetaAdLibraryProvider extends ProxyProvider {
  constructor() { super('meta', 'Meta Ad Library', { ads: ['facebook'] }); }
  async getAdStatus(product, ctx) {
    const j = await this.call('ads', ctx, { q: product.title, country: ctx.country });
    return { facebook: cleanAd(j, adLinks(product.title, ctx.country).facebook) };
  }
}
