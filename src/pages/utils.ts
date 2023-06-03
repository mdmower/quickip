/**
 * @license Apache-2.0
 */

import {DisplayTheme, DisplayThemeSetting} from '../interfaces';
import {getIndividualStorageData} from '../storage';

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
