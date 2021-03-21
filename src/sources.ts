/**
 * @license Apache-2.0
 */

import {
  getDefaultSourcesData,
  getDefaultSourcesDataForVersion,
  getDefaultStorageData,
} from './default-sources';
import {
  IPvxSourceData,
  IndividualSource,
  IpVersionIndex,
  SourceData,
  StorageSourceStatesIndex,
  VersionStatesIndex,
  getIpVersionFromSSSI,
} from './interfaces';
import {QipStorage} from './storage';
import {assertObject, getTypedKeys, isObject} from './utils';

/**
 * IP sources handling
 */
class QipSources {
  /**
   * Storage handler
   */
  private storage_: QipStorage;

  /**
   * IP sources data
   */
  private data_: SourceData = getDefaultSourcesData();

  /**
   * Whether sources have been initialized
   */
  private initialized_: boolean = false;

  /**
   * @param storage Storage handler
   */
  constructor(storage: QipStorage) {
    this.storage_ = storage;
  }

  /**
   * Initialize (if necessary) source data
   */
  public async init(): Promise<void> {
    if (this.initialized_) {
      return;
    }
    this.initialized_ = true;

    await this.storage_.init();
    this.storage_.addStorageChangeCallback(this.applySourceOptions.bind(this));
    return this.applySourceOptions();
  }

  /**
   * Get the IP version ID that should be automatically enabled if the user attempts to un-select
   * all versions in Options
   */
  public getDefaultVersion(): IpVersionIndex {
    if (!this.initialized_) {
      throw new Error('Sources have not yet been initialized');
    }

    return (
      getTypedKeys(this.data_).find((version) => {
        return this.data_[version].default;
      }) || IpVersionIndex.V4 // should not get here
    );
  }

  /**
   * Get an array of all known IP version IDs
   */
  public getVersions(): IpVersionIndex[] {
    if (!this.initialized_) {
      throw new Error('Sources have not yet been initialized');
    }

    return getTypedKeys(this.data_);
  }

  /**
   * Get all data for a specific IP version
   * @param version IP version
   */
  public getVersionData(version?: IpVersionIndex): IPvxSourceData {
    if (!this.initialized_) {
      throw new Error('Sources have not yet been initialized');
    }
    if (!version || !this.getVersions().includes(version)) {
      throw new Error(`Unrecognized IP version "${version || ''}"`);
    }

    return this.data_[version];
  }

  /**
   * Get info for all sources under a specific IP version
   * @param version IP version
   */
  public getSources(version: IpVersionIndex): {[key: string]: IndividualSource} {
    if (!this.initialized_) {
      throw new Error('Sources have not yet been initialized');
    }

    const sources = this.getVersionData(version).sources;
    return Object.keys(sources).reduce((verifiedSources, id) => {
      const sourceData = sources[id];
      if (sourceData) {
        verifiedSources[id] = sourceData;
      }
      return verifiedSources;
    }, <{[key: string]: IndividualSource}>{});
  }

  /**
   * Get info for a specific source under a specific IP version
   * @param version IP version
   * @param id Source ID
   */
  public getSourceData(version: IpVersionIndex, id: string): IndividualSource {
    if (!this.initialized_) {
      throw new Error('Sources have not yet been initialized');
    }

    const sources = this.getSources(version);
    if (!id) {
      throw new Error(`Missing source ID "${id}" for IP version "${version}"`);
    }
    const sourceData = sources[id];
    if (!sourceData) {
      throw new Error(`Unrecognized source ID "${id}" for IP version "${version}"`);
    }
    return sourceData;
  }

  /**
   * Get the default source ID that should be automatically enabled if the user attempts to
   * un-select all sources for a specific IP version in Options
   * @param version IP version
   */
  public getDefaultSourceId(version: IpVersionIndex): string {
    if (!this.initialized_) {
      throw new Error('Sources have not yet been initialized');
    }

    const sources = this.getSources(version);
    return (
      Object.keys(sources).find((id) => {
        return this.data_[version].sources[id];
      }) || 'icanhazip' // should not get here
    );
  }

  /**
   * Get an array of all known source IDs for a specific IP version
   * @param version IP version
   */
  public getSourceIds(version: IpVersionIndex): string[] {
    if (!this.initialized_) {
      throw new Error('Sources have not yet been initialized');
    }

    const sources = this.getSources(version);
    return Object.keys(sources);
  }

  /**
   * Get an array of all known source IDs for a specific IP version sorted by user preference
   * @param version IP version
   */
  public getOrderedSourceIds(version: IpVersionIndex): string[] {
    if (!this.initialized_) {
      throw new Error('Sources have not yet been initialized');
    }

    const sources = this.getSources(version);
    return Object.keys(sources).sort((a, b) => sources[a].order - sources[b].order);
  }

  /**
   * Get an array of all enabled source IDs for a specific IP version
   * @param version IP version
   */
  public getEnabledSourceIds(version: IpVersionIndex): string[] {
    if (!this.initialized_) {
      throw new Error('Sources have not yet been initialized');
    }

    const sources = this.getSources(version);
    return Object.keys(sources).filter((id) => sources[id].enabled);
  }

  /**
   * Get an array of all enabled source IDs for a specific IP version sorted by user preference
   * @param version IP version
   */
  public getOrderedEnabledSourceIds(version: IpVersionIndex): string[] {
    if (!this.initialized_) {
      throw new Error('Sources have not yet been initialized');
    }

    const sources = this.getSources(version);
    return Object.keys(sources)
      .filter((id) => sources[id].enabled)
      .sort((a, b) => sources[a].order - sources[b].order);
  }

  /**
   * Restore original source data
   * @param version IP version
   */
  public restoreData(version?: IpVersionIndex): void {
    if (!this.initialized_) {
      throw new Error('Sources have not yet been initialized');
    }

    if (version !== undefined) {
      this.data_[version] = getDefaultSourcesDataForVersion(version);
    } else {
      this.data_ = getDefaultSourcesData();
    }
  }

  /**
   * Apply options to user source data
   *
   * Attempts to be as safe as possible when the incoming options parameter has not been verified.
   * See resources/sample-storage-options.json for an example of the information stored in Chrome
   * storage and the expected schema of the incoming options parameter. For now, this is the
   * smallest and quickest way to perform data validation. Libraries like superstruct and joi
   * could simplify this, but only at the expense of adding several hundred KB to this package's
   * final size.
   */
  public async applySourceOptions(): Promise<void> {
    let unverifiedOpts = await this.storage_.getOptions();
    if (!isObject(unverifiedOpts) || Object.keys(unverifiedOpts).length === 0) {
      unverifiedOpts = getDefaultStorageData();
      await this.storage_.setOptions(unverifiedOpts);
    }
    const opts = unverifiedOpts;

    // Use default storage data as a reliable tree that can be crawled
    // and look for corresponding properties in the unverified options.
    const storageData = getDefaultStorageData();
    getTypedKeys(storageData).forEach((name) => {
      if (opts[name] === undefined) {
        // This is an indication that storage was cleared. Assume
        // default options.
        opts[name] = storageData[name];
      }

      let opt: Record<string, unknown>;
      try {
        opt = assertObject(opts[name]);
      } catch (ex) {
        return;
      }

      if (name === VersionStatesIndex) {
        const storageVersionStates = storageData[name];
        getTypedKeys(storageVersionStates).forEach((version) => {
          const activeVersionState = this.data_[version];
          const optVersionEnabled = opt[version];
          if (typeof optVersionEnabled === 'boolean') {
            storageVersionStates[version] = optVersionEnabled;
          }

          activeVersionState.enabled = storageVersionStates[version];
        });
      } else if (name === StorageSourceStatesIndex.V4 || name === StorageSourceStatesIndex.V6) {
        const version = getIpVersionFromSSSI(name);
        const storageSourceStates = storageData[name];
        Object.keys(storageSourceStates).forEach((id) => {
          const activeSourceState = this.data_[version].sources[id];
          const storageSourceState = storageSourceStates[id];
          if (!storageSourceState || !activeSourceState) {
            return;
          }

          let optSourceState: Record<string, unknown>;
          try {
            optSourceState = assertObject(opt[id]);
          } catch (ex) {
            return;
          }

          const optSourceStateEnabled = optSourceState.enabled;
          if (typeof optSourceStateEnabled === 'boolean') {
            storageSourceState.enabled = optSourceStateEnabled;
          }
          const optSourceStateOrder = optSourceState.order;
          if (typeof optSourceStateOrder === 'number' && optSourceStateOrder >= 0) {
            storageSourceState.order = Math.floor(optSourceStateOrder);
          }

          activeSourceState.enabled = storageSourceState.enabled;
          activeSourceState.order = storageSourceState.order;
        });
      }
    });
  }
}

export {QipSources};
