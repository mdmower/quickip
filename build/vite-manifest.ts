/**
 * @license Apache-2.0
 */

import {existsSync, mkdirSync} from 'node:fs';
import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import deepmerge from 'deepmerge';
import colors from 'colors';
import {Plugin} from 'vite';
import {version} from '../package.json';
import {Browser, dirRef} from './utils.js';

const {bold} = colors;

const common: chrome.runtime.ManifestV3 = {
  action: {
    default_icon: {
      16: 'icons/icon16.png',
      19: 'icons/icon19.png',
      24: 'icons/icon24.png',
      32: 'icons/icon32.png',
      38: 'icons/icon38.png',
      48: 'icons/icon48.png',
    },
    default_popup: 'bubble.html',
    default_title: 'Find your IP',
  },
  commands: {
    'quick-copy-ipv4': {
      suggested_key: {
        default: 'Ctrl+Shift+4',
        mac: 'Command+Shift+4',
      },
      description: 'Copy IPv4 to clipboard',
    },
    'quick-copy-ipv6': {
      suggested_key: {
        default: 'Ctrl+Shift+6',
        mac: 'Command+Shift+6',
      },
      description: 'Copy IPv6 to clipboard',
    },
  },
  description: 'Quickly find and copy your public IPv4 and IPv6 addresses',
  icons: {
    16: 'icons/icon16.png',
    19: 'icons/icon19.png',
    24: 'icons/icon24.png',
    32: 'icons/icon32.png',
    38: 'icons/icon38.png',
    48: 'icons/icon48.png',
    128: 'icons/icon128.png',
  },
  manifest_version: 3,
  name: 'QuickIP',
  permissions: ['clipboardWrite', 'storage'],
  host_permissions: [
    'https://*.ipify.org/',
    'https://*.ident.me/',
    'https://*.icanhazip.com/',
    'https://*.wtfismyip.com/',
  ],
  version,
};

const manifest: Record<Browser, chrome.runtime.ManifestV3> = {
  chrome: deepmerge(common, {
    background: {
      service_worker: 'sw.js',
      type: 'module',
    },
    options_page: 'options.html',
    permissions: ['offscreen'],
  }),
  edge: deepmerge(common, {
    background: {
      service_worker: 'sw.js',
      type: 'module',
    },
    options_page: 'options.html',
    permissions: ['offscreen'],
  }),
  firefox: deepmerge(common, {
    background: {
      scripts: ['background.js'],
      type: 'module',
    },
    browser_specific_settings: {
      gecko: {
        id: '{56f45803-b8a1-493c-b6e2-d915306e33eb}',
        strict_min_version: '115.0',
      },
    },
    options_ui: {
      page: 'options.html',
      open_in_tab: true,
    },
  }),
};

/**
 * Write manifest.json
 * @param debug Whether to run in debug mode
 * @param browser Target browser
 */
async function writeManifest(debug: boolean, browser: Browser): Promise<void> {
  try {
    let manifestObj = manifest[browser];

    // If local.manifest.json exists and this is a debug build, merge into manifest.
    if (debug) {
      const localManifestPath = path.join(dirRef.root, 'local.manifest.json');
      if (existsSync(localManifestPath)) {
        const localManifestJson = await readFile(localManifestPath, 'utf-8');
        const localManifestObj = JSON.parse(localManifestJson) as chrome.runtime.ManifestV3;
        if (browser == 'firefox' && 'key' in localManifestObj) {
          delete localManifestObj.key;
        }
        manifestObj = deepmerge(manifestObj, localManifestObj);
      }
    }

    const manifestJson = JSON.stringify(manifestObj, undefined, debug ? 2 : undefined);
    const mainfestPath = path.join(dirRef.dist, browser, 'manifest.json');
    console.log(`${bold.green('[Writing manifest]')} manifest.json`);
    await writeFile(mainfestPath, manifestJson, 'utf-8');
  } catch (ex) {
    console.error(bold.red(`[Build error] Unexpected error in ${writeManifest.name}`));
    if (ex) {
      console.error(ex);
    }
    return Promise.reject();
  }
}

/**
 * Vite plugin to create and output manifests
 * @param debug Whether to run in debug mode
 * @param browser Target browser
 */
export default function manifestPlugin(debug: boolean, browser: Browser): Plugin {
  return {
    name: 'manifest-plugin',
    async closeBundle() {
      mkdirSync(path.join(dirRef.dist, browser), {recursive: true});
      await writeManifest(debug, browser);
    },
  };
}
