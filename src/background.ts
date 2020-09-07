/**
 * @license Apache-2.0
 */

import {QipActions} from './actions';
import {IpVersionIndex} from './interfaces';
import {QipSources} from './sources';
import {QipStorage} from './storage';

declare global {
  interface Window {
    // Allow other pages to read public instances of
    // initialized classes.
    qipBackground: QipBackground;
  }
}

document.addEventListener(
  'DOMContentLoaded',
  function () {
    const qipBackground = new QipBackground();
    global.window.qipBackground = qipBackground;
    qipBackground.init().catch((error) => {
      console.error('Init failed\n', error);
    });
  },
  false
);

class QipBackground {
  private initd_: boolean;
  sources: QipSources;
  actions: QipActions;
  storage: QipStorage;

  constructor() {
    this.initd_ = false;
    this.storage = new QipStorage();
    this.sources = new QipSources(this.storage);
    this.actions = new QipActions(this.sources);
  }

  /**
   * Initialize background page
   */
  async init(): Promise<void> {
    if (this.initd_) {
      return;
    }
    this.initd_ = true;

    await this.sources.init();
    await this.actions.init();
    await this.storage.init();
    this.startListeners();
  }

  /**
   * Start listeners
   */
  private startListeners(): void {
    /**
     * Listen for shortcuts: https://developer.chrome.com/apps/commands
     */
    chrome.commands.onCommand.addListener((command) => {
      switch (command) {
        case 'quick-copy-ipv4':
          this.copyIpToClipboard(IpVersionIndex.V4);
          break;
        case 'quick-copy-ipv6':
          this.copyIpToClipboard(IpVersionIndex.V4);
          break;
        default:
          break;
      }
    });
  }

  /**
   * Request an IP and copy it to the clipboard in the background
   * @param version IP version
   */
  private copyIpToClipboard(version: IpVersionIndex): void {
    let ids = this.sources.getOrderedEnabledSourceIds(version);
    if (!ids.length) {
      ids = [this.sources.getDefaultSourceId(version)];
    }

    this.actions
      .requestIP(version, ids, 0)
      .then(this.writeToClipboard.bind(this))
      .catch((error) => console.log('copyIpToClipboard: Unable to complete request\n', error));
  }

  /**
   * Copy a string to the clipboard
   * @param str String for clipboard
   */
  private writeToClipboard(str: string): void {
    // navigator.clipboard.writeText doesn't work since non-active-tab
    console.log('writeToClipboard: Contents: "' + str + '"');
    document.oncopy = function (event) {
      if (event.clipboardData) {
        event.clipboardData.setData('text/plain', str);
        event.preventDefault();
      }
    };
    document.execCommand('copy', false, undefined);
  }
}
