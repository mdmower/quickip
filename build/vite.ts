/**
 * @license Apache-2.0
 */

import path from 'node:path';
import purgecss from '@fullhuman/postcss-purgecss';
import type {InlineConfig} from 'vite';
import {Browser, dirRef} from './utils.js';
import deepmerge from 'deepmerge';

/**
 * Generate browser-specific Vite configs: one for HTML pages, one per script entry
 * @param debug Whether to run in debug mode
 * @param browser Target browser
 */
export function getViteConfigs(debug: boolean, browser: Browser): InlineConfig[] {
  const htmlInputs: Record<string, string> = {
    bubble: path.resolve(dirRef.src, 'bubble.html'),
    options: path.resolve(dirRef.src, 'options.html'),
  };
  if (browser !== 'firefox') {
    htmlInputs.offscreen = path.resolve(dirRef.src, 'offscreen.html');
  }

  const scriptInputs: Record<string, string> = {};
  if (browser !== 'firefox') {
    scriptInputs.sw = path.resolve(dirRef.src, 'sw.ts');
  } else {
    scriptInputs.background = path.resolve(dirRef.src, 'background.ts');
  }

  const commonConfig = {
    configFile: false,
    root: dirRef.src,
    build: {
      outDir: path.join(dirRef.dist, browser),
      emptyOutDir: false,
      sourcemap: debug && 'inline',
      assetsInlineLimit: 0,
      minify: !debug,
    },
    define: {
      G_QIP_BROWSER: JSON.stringify(browser),
    },
  } satisfies Partial<InlineConfig>;

  const htmlConfig: InlineConfig = deepmerge(commonConfig, {
    build: {
      rolldownOptions: {
        input: htmlInputs,
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: '[name].chunk.js',
        },
      },
    },
    css: {
      postcss: {
        plugins: [
          // ESM type definitions are incorrect for default purgecss import
          (purgecss as unknown as typeof purgecss.default)({
            contentFunction: (sourceFile) => {
              const name = path.basename(sourceFile).split('.')[0];
              const sources = [`src/${name}.html`, `src/${name}.ts`, `src/utils.ts`];
              if (name === 'options') {
                sources.push('node_modules/bootstrap/js/dist/modal.js');
                sources.push('node_modules/bootstrap/js/dist/tab.js');
              }
              return sources;
            },
            safelist: [/^modal-/],
          }),
        ],
      },
      preprocessorOptions: {
        scss: {
          quietDeps: true,
          silenceDeprecations: ['import'],
        },
      },
    },
  } satisfies Partial<InlineConfig>);

  // Each script gets its own config because Rolldown extracts shared modules (e.g. lib/logger,
  // lib/messaging) into chunks from which the entries `import`. The Chrome service worker and the
  // Firefox background script (and any future content scripts) load as classic scripts, so runtime
  // ES imports would fail. Using IIFE format enforces a single self-contained file per entry.
  const scriptConfigs: InlineConfig[] = Object.entries(scriptInputs).map(([name, input]) =>
    deepmerge(commonConfig, {
      build: {
        rolldownOptions: {
          input: {[name]: input},
          output: {
            format: 'iife',
            entryFileNames: '[name].js',
          },
        },
      },
    } satisfies Partial<InlineConfig>)
  );

  return [htmlConfig, ...scriptConfigs];
}
