/**
 * @license Apache-2.0
 */

import {InternalMessage} from './interfaces';

export default class QipStorage {
  private inited_: boolean;
  private changeHandlerEnabled_: boolean;
  // It is not possible to listen for messages in the same (background) context
  // https://bugs.chromium.org/p/chromium/issues/detail?id=479951
  // Manually create a hook that gets called on storage updates.
  public storageChangeSourcesHook: () => Promise<void>;

  constructor() {
    this.inited_ = false;
    this.changeHandlerEnabled_ = false;
    this.storageChangeSourcesHook = () => Promise.resolve();
  }

  /**
   * Initialize (if necessary) storage
   */
  async init(): Promise<void> {
    if (this.inited_) {
      return;
    }
    this.inited_ = true;

    chrome.storage.onChanged.addListener(this.storageChangeHandler.bind(this));
    this.toggleChangeHandler(true);

    return Promise.resolve();
  }

  /**
   * Handle storage change events and broadcast notification
   * @param changes StorageChanges from chrome.storage.onChanged
   * @param namespace Chrome storage area
   */
  storageChangeHandler(
    changes: {[key: string]: chrome.storage.StorageChange},
    namespace: string
  ): void {
    if (!this.changeHandlerEnabled_ || namespace !== 'sync') {
      return;
    }

    console.log('New settings available from sync storage:\n', changes);

    this.storageChangeSourcesHook()
      .catch((error) => {
        console.error('Failed to apply sources update from storage sync\n', error);
      })
      .finally(() => {
        chrome.runtime.sendMessage(<InternalMessage>{
          cmd: 'settings_updated',
        });
      });
  }

  /**
   * Enable or disable the storage change handler
   * @param state Whether storage change handler should be enabled or disabled
   */
  toggleChangeHandler(state: boolean): void {
    this.changeHandlerEnabled_ = state;
  }

  /**
   * Get the value of a stored option
   * @param option Option name
   */
  async getOption(option: string): Promise<any> {
    return this.getOptions([option]).then((stg) => stg[option]);
  }

  /**
   * Get the values of multiple stored options
   * @param options Option names
   */
  async getOptions(options?: string[]): Promise<{[key: string]: any}> {
    return new Promise((resolve) => {
      chrome.storage.sync.get(options || null, resolve);
    });
  }

  /**
   * Set the value of an option in storage
   * @param option Option name
   * @param value Option value
   */
  async setOption(option: string, value: any): Promise<void> {
    // Computed property names (ES2015)
    return this.setOptions({[option]: value});
  }

  /**
   * Set the value of multiple options in storage
   * @param options Option name/value pairs
   */
  async setOptions(options: {[key: string]: any}): Promise<void> {
    this.toggleChangeHandler(false);
    await new Promise((resolve) => {
      chrome.storage.sync.set(options, () => resolve(undefined));
    });
    this.toggleChangeHandler(true);
  }

  /**
   * Clear options from storage
   */
  async clearOptions(): Promise<void> {
    this.toggleChangeHandler(false);
    await new Promise((resolve) => {
      chrome.storage.sync.clear(() => resolve(undefined));
    });
    this.toggleChangeHandler(true);
  }
}

export {QipStorage};
