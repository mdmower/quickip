/**
 * @license Apache-2.0
 */

import deepmerge from 'deepmerge';
import {version} from '../package.json';

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

const chrome = deepmerge(common, {
  background: {
    service_worker: 'sw.js',
  },
  options_page: 'options.html',
  permissions: ['offscreen'],
});

const edge = deepmerge(common, {
  background: {
    service_worker: 'sw.js',
  },
  options_page: 'options.html',
  permissions: ['offscreen'],
});

const firefox = deepmerge(common, {
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

export const manifest = {chrome, edge, firefox};
