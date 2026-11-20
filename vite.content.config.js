// Build 2/2: content script as a self-contained IIFE (no imports at runtime).
import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const r = (p) => resolve(root, p);

export default defineConfig({
  root: r('extension'),
  publicDir: false,
  resolve: { alias: { '@': r('extension/src') } },
  build: {
    outDir: r('dist'),
    emptyOutDir: false,
    sourcemap: false,
    target: 'es2022',
    lib: { entry: r('extension/src/content/index.js'), formats: ['iife'], name: 'TrendScoutContent', fileName: () => 'content.js' },
  },
});
