/**
 * @license Apache-2.0
 */

/**
 * Storage handling
 */
class QipStorage {
  /**
   * Whether the storage change handler is enabled
   */
  private changeHandlerEnabled_: boolean = false;

  /**
   * Callback functions to run on storage change events
   */
  private storageChangeCallbacks_: (() => Promise<void>)[] = [];

  /**
   * Whether storage has been initialized
   */
  private initialized_: boolean = false;

  /**
   * Initialize (if necessary) storage
   */
  public async init(): Promise<void> {
    if (this.initialized_) {
      return;
    }
    this.initialized_ = true;

    chrome.storage.onChanged.addListener(this.storageChangeHandler.bind(this));
    this.toggleChangeHandler(true);

    return Promise.resolve();
  }

  /**
   * Add a callback function to run on storage change events
   * @param callback Callback function
   */
  public addStorageChangeCallback(callback: () => Promise<void>): void {
    // TODO: Check on 'this' context possibilities. Could a callback
    // be designed to access private members of this class?
    this.storageChangeCallbacks_.push(callback);
  }

  /**
   * Remove all callback functions from running on storage change events
   */
  public clearStorageChangeCallbacks(): void {
    this.storageChangeCallbacks_ = [];
  }

  /**
   * Handle storage change events and broadcast notification
   * @param changes StorageChanges from chrome.storage.onChanged
   * @param namespace Chrome storage area
   *
   * Note: It is not possible to listen for messages in the same context
   * (https://bugs.chromium.org/p/chromium/issues/detail?id=479951). So,
   * storageChangeSourcesHook can be overriden will be called on storage
   * updates.
   */
  private storageChangeHandler(
    changes: {[key: string]: chrome.storage.StorageChange},
    namespace: string
  ): void {
    if (!this.changeHandlerEnabled_ || namespace !== 'sync') {
      return;
    }

    console.log('New settings available from sync storage:\n', changes);

    // Assume order matters and run callbacks sequentially
    this.storageChangeCallbacks_
      .reduce((prev, curr, idx) => {
        return prev
          .then(curr)
          .catch((error) =>
            console.error(
              `Failed to run callback at index ${idx} after storage change detected\n`,
              error
            )
          );
      }, Promise.resolve())
      .catch((error) => console.error(`Failed to run storage change callbacks\n`, error));
  }

  /**
   * Enable or disable the storage change handler
   * @param state Whether storage change handler should be enabled or disabled
   */
  public toggleChangeHandler(state: boolean): void {
    this.changeHandlerEnabled_ = state;
  }

  /**
   * Get the value of a stored option
   * @param option Option name
   */
  public async getOption(option: string): Promise<unknown> {
    return this.getOptions([option]).then((stg) => stg[option]);
  }

  /**
   * Get the values of multiple stored options
   * @param options Option names
   */
  public async getOptions(options?: string[]): Promise<Record<string, unknown>> {
    return new Promise((resolve) => {
      chrome.storage.sync.get(options || null, resolve);
    });
  }

  /**
   * Set the value of an option in storage
   * @param option Option name
   * @param value Option value
   */
  public async setOption(option: string, value: unknown): Promise<void> {
    // Computed property names (ES2015)
    return this.setOptions({[option]: value});
  }

  /**
   * Set the value of multiple options in storage
   * @param options Option name/value pairs
   */
  public async setOptions(options: Record<string, unknown>): Promise<void> {
    this.toggleChangeHandler(false);
    return new Promise((resolve) => {
      chrome.storage.sync.set(options, () => {
        this.toggleChangeHandler(true);
        resolve(undefined);
      });
    });
  }

  /**
   * Clear options from storage
   */
  public async clearOptions(): Promise<void> {
    this.toggleChangeHandler(false);
    return new Promise((resolve) => {
      chrome.storage.sync.clear(() => {
        this.toggleChangeHandler(true);
        resolve(undefined);
      });
    });
  }
}

export {QipStorage};
