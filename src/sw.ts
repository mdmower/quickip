/**
 * @license Apache-2.0
 */

import {handleCommand} from './command';
import {logInfo} from './logger';
import {storageChangeHandler} from './storage';

self.addEventListener('install', install);
self.addEventListener('activate', activate);

chrome.commands.onCommand.addListener(handleCommand);
chrome.storage.onChanged.addListener(storageChangeHandler);

/**
 * Handle service worker install event
 */
function install() {
  logInfo('Service worker installed');
}

/**
 * Handle service worker activate event
 */
function activate() {
  logInfo('Service worker activated');
}
