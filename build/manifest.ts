/**
 * @license Apache-2.0
 */

import path from 'node:path';
import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import deepmerge from 'deepmerge';
import packageJson from '../package.json' with {type: 'json'};
import {Browser, dirRef} from './utils.js';

/**
 * Generate browser-specific manifest
 * @param debug Whether to run in debug mode
 * @param browser Target browser
 */
export async function getManifest(
  debug: boolean,
  browser: Browser
): Promise<chrome.runtime.ManifestV3> {
  let manifest: chrome.runtime.ManifestV3 = {
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
    version: packageJson.version,
  };

  // If local.manifest.json exists and this is a debug build, merge into manifest.
  if (debug) {
    const localManifestPath = path.join(dirRef.root, 'local.manifest.json');
    if (existsSync(localManifestPath)) {
      const localManifestJson = await readFile(localManifestPath, 'utf-8');
      const localManifest = JSON.parse(localManifestJson) as chrome.runtime.ManifestV3;
      if (browser === 'firefox' && 'key' in localManifest) {
        delete localManifest.key;
      }
      manifest = deepmerge(manifest, localManifest);
    }
  }

  if (browser === 'firefox') {
    return deepmerge(manifest, {
      background: {
        scripts: ['background.js'],
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
    });
  }

  return deepmerge(manifest, {
    background: {
      service_worker: 'sw.js',
    },
    options_page: 'options.html',
    permissions: ['offscreen'],
  });
}
