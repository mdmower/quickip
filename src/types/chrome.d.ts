declare namespace chrome.commands {
  /**
   * Opens the browser UI that enables users to configure an extension's keyboard shortcuts.
   *
   * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/commands/openShortcutSettings
   */
  export const openShortcutSettings: (() => Promise<void>) | undefined;
}
