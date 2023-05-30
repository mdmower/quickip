/**
 * @license Apache-2.0
 */

import {getIp} from '../actions';
import {IpVersionIndex} from '../interfaces';
import {logError, logInfo} from '../logger';

document.addEventListener(
  'DOMContentLoaded',
  function () {
    new QipCopyIpPopup().init().catch((error) => {
      logError('Unexpected error during initialization', error);
    });
  },
  false
);

class QipCopyIpPopup {
  /**
   * Number of milliseconds to display an error message before closing window
   */
  private errorDisplayTime_: number = 2000;

  /**
   * Initialize popup
   */
  public async init(): Promise<void> {
    const version = this.getVersion();
    if (version) {
      try {
        return this.insertIP(version);
      } catch (ex) {
        logError('Failed to fetch and copy IP\n', ex);
        window.close();
      }
    } else {
      this.showError('Invalid IP version requested');
      try {
        return this.closePopup(this.errorDisplayTime_);
      } catch (ex) {
        logError('Delayed close failed\n', ex);
        window.close();
      }
    }
  }

  /**
   * Get IP version from URL
   */
  private getVersion(): IpVersionIndex | undefined {
    const url = new URL(location.href);
    const versionStr = url.searchParams.get('ip_version');
    return versionStr === IpVersionIndex.V4 || versionStr === IpVersionIndex.V6
      ? versionStr
      : undefined;
  }

  /**
   * Show an error message in the popup
   * @param msg Error message
   */
  private showError(msg: string): void {
    const searchingMsgNode = document.querySelector<HTMLDivElement>('#searching-msg');
    const outputNode = document.querySelector<HTMLDivElement>('#output');
    const errorMsgNode = document.querySelector<HTMLDivElement>('#error-msg');
    if (!searchingMsgNode || !outputNode || !errorMsgNode) {
      logError('showError: Unexpected popup HTML');
      return;
    }

    errorMsgNode.textContent = msg || 'Unknown error';
    searchingMsgNode.style.display = 'none';
    outputNode.style.display = 'none';
    errorMsgNode.style.display = 'block';
  }

  /**
   * For the requested IP version, request an IP address, display it
   * in the popup output, and automatically copy it to the clipboard
   * @param version IP version
   */
  private async insertIP(version: IpVersionIndex): Promise<void> {
    const searchingMsgNode = document.querySelector<HTMLDivElement>('#searching-msg');
    const outputNode = document.querySelector<HTMLDivElement>('#output');
    const ipOutputNode = document.querySelector<HTMLSpanElement>('#ip-output');
    const errorMsgNode = document.querySelector<HTMLDivElement>('#error-msg');
    if (!searchingMsgNode || !outputNode || !ipOutputNode || !errorMsgNode) {
      logError('insertIP: Unexpected popup HTML');
      return this.closePopup();
    }

    const ip = await getIp(version);
    if (!ip) {
      this.showError(`Could not find IP${version} address`);
      return this.closePopup(this.errorDisplayTime_);
    }

    ipOutputNode.textContent = ip;
    searchingMsgNode.style.display = 'none';
    outputNode.style.display = 'block';

    await this.copyIP(ip);
    // Issue 1377703: navigator.clipboard.writeText resolves too early
    // https://bugs.chromium.org/p/chromium/issues/detail?id=1377703
    return this.closePopup(10);
  }

  /**
   * Close popup window
   * @param delay Delay in milliseconds before popup should be closed
   */
  private async closePopup(delay?: number): Promise<void> {
    if (!delay || delay < 0) {
      return window.close();
    }

    let remainingSeconds = delay;
    await new Promise((resolve) => {
      const interval = setInterval(() => {
        remainingSeconds -= 1;
        if (remainingSeconds <= 0) {
          clearInterval(interval);
          resolve(undefined);
        }
      }, delay);
    });

    window.close();
  }

  /**
   * Write an IP to the clipboard
   * @param ip IP address
   */
  private async copyIP(ip: string): Promise<void> {
    if (!ip) {
      return;
    }

    logInfo(`copyIP: Contents: "${ip}"`);
    return navigator.clipboard.writeText(ip).catch((error) => {
      logError('Failed to copy IP to clipboard', error);
    });
  }
}
