import path from 'node:path';
import {defineConfig} from 'vite';
import manifestPlugin from './build/vite-manifest.js';

export default defineConfig({
  root: 'src',
  resolve: {
    alias: {
      '~bootstrap': path.resolve('node_modules/bootstrap'),
    },
  },
  plugins: [manifestPlugin(false, 'chrome')],
  define: {
    G_QIP_BROWSER: JSON.stringify('chrome'),
  },
  publicDir: path.resolve(import.meta.dirname, 'static'),
  build: {
    modulePreload: false,
    outDir: path.resolve(import.meta.dirname, 'dist/chrome'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        options: path.resolve(import.meta.dirname, 'src/options.html'),
        bubble: path.resolve(import.meta.dirname, 'src/bubble.html'),
        offscreen: path.resolve(import.meta.dirname, 'src/offscreen.html'),
        sw: path.resolve(import.meta.dirname, 'src/sw.ts'),
      },
      output: {
        entryFileNames(chunkInfo) {
          return chunkInfo.name + '.js';
        },
      },
    },
  },
});
