/**
 * @license Apache-2.0
 */

import {getIp} from './lib/actions';
import {DisplayTheme, DisplayThemeSetting, IpVersionIndex} from './lib/interfaces';
import {logInfo, logWarn} from './lib/logger';
import {getIndividualStorageData} from './lib/storage';

/**
 * Apply theme to page
 * @param win Window
 * @param theme Theme to apply
 */
export async function applyTheme(win: Window, theme?: DisplayTheme): Promise<void> {
  if (theme === undefined) {
    theme = await getIndividualStorageData<typeof DisplayThemeSetting>(DisplayThemeSetting);
  }

  if (
    theme === DisplayTheme.Dark ||
    (theme === DisplayTheme.System && win.matchMedia('(prefers-color-scheme: dark)').matches)
  ) {
    win.document.documentElement.setAttribute('data-bs-theme', DisplayTheme.Dark);
  } else {
    win.document.documentElement.setAttribute('data-bs-theme', DisplayTheme.Light);
  }
}

/**
 * Find IP address and copy to clipboard in the background page
 * @param version IP version
 */
export async function copyIpBackground(version: IpVersionIndex): Promise<void> {
  const ip = await getIp(version);
  if (!ip) {
    logWarn('copyIp: IP could not be determined, aborting.');
    return;
  }
  logInfo(`copyIP: ${ip}`);

  // The navigator.clipboard API requires that the window is focused, but
  // background documents cannot be focused. Fall back to old method.
  // await navigator.clipboard.writeText(ip);
  document.oncopy = function (event) {
    if (event.clipboardData) {
      event.clipboardData.setData('text/plain', ip);
      event.preventDefault();
    }
  };
  document.execCommand('copy', false, undefined);
}
