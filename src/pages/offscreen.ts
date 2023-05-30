/**
 * @license Apache-2.0
 */

import {logError} from '../logger';
import {MessageCmd, OffscreenAction, isOffscreenDocMessage} from '../messaging';

document.addEventListener(
  'DOMContentLoaded',
  function () {
    new QipOffscreen().init();
  },
  false
);

class QipOffscreen {
  /**
   * Initialize offscreen document.
   */
  public init(): void {
    this.startListeners();
  }

  /**
   * Attach window/element listeners.
   */
  private startListeners(): void {
    chrome.runtime.onMessage.addListener(this.runtimeMessageHandler.bind(this));
  }

  /**
   * Handle runtime messages
   * @param message Internal message
   * @param sender Message sender
   * @param sendResponse Response callback
   */
  private runtimeMessageHandler(
    message: unknown,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ): boolean | void {
    if (!isOffscreenDocMessage(message) || !message.data) {
      return;
    }

    switch (message.data.action) {
      case OffscreenAction.CopyIp:
        this.copyIp(String(message.data.data)).finally(() => {
          sendResponse({
            cmd: MessageCmd.OffscreenDoc,
            data: {
              action: OffscreenAction.CopyIp,
              data: '',
            },
          });
        });
        break;
      default:
        break;
    }

    // We will respond asynchronously
    return true;
  }

  /**
   * Write an IP to the clipboard
   * @param ip IP address
   */
  private async copyIp(ip: string): Promise<void> {
    if (!ip) {
      return;
    }

    try {
      // https://github.com/GoogleChrome/chrome-extensions-samples/blob/main/functional-samples/cookbook.offscreen-clipboard-write/offscreen.js#L52-L54
      // The navigator.clipboard API requires that the window is focused, but
      // offscreen documents cannot be focused. Fall back to old method.
      // await navigator.clipboard.writeText(ip);
      document.oncopy = function (event) {
        if (event.clipboardData) {
          event.clipboardData.setData('text/plain', ip);
          event.preventDefault();
        }
      };
      document.execCommand('copy', false, undefined);

      // Work around Chromium bug https://bugs.chromium.org/p/chromium/issues/detail?id=1377703
      await new Promise((r) => setTimeout(r, 20));
    } catch (ex) {
      logError('Failed to copy IP to clipboard', ex);
    }
  }
}
