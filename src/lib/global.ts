/**
 * @license Apache-2.0
 */

export type QipBrowser = 'chrome' | 'edge' | 'firefox';

// From Vite defines
declare const G_QIP_BROWSER: QipBrowser;

export const qipBrowser = G_QIP_BROWSER;
