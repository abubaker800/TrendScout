// Build 1/2: the three UI pages (popup, dashboard/options, side panel) + the MV3 service worker.
// The content script is built separately (vite.content.config.js) as a classic IIFE because
// content scripts cannot be ES modules with shared chunks.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const r = (p) => resolve(root, p);

export default defineConfig({
  root: r('extension'),
  base: './',
  plugins: [react()],
  resolve: { alias: { '@': r('extension/src') } },
  css: { postcss: root }, // directory containing postcss.config.cjs (Tailwind + Autoprefixer)
  build: {
    outDir: r('dist'),
    emptyOutDir: false, // scripts/clean.js empties dist so both builds can share it
    sourcemap: false,
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      input: {
        popup: r('extension/popup.html'),
        dashboard: r('extension/dashboard.html'),
        sidepanel: r('extension/sidepanel.html'),
        background: r('extension/src/background/index.js'),
      },
      output: {
        entryFileNames: (chunk) => (chunk.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js'),
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][ext]',
      },
    },
  },
});
