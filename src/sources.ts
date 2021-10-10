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

export default class QipSources {
  private inited_: boolean;
  private data_: SourceData;
  private storage_: QipStorage;

  constructor(storage: QipStorage) {
    this.inited_ = false;
    this.data_ = getDefaultSourcesData();
    this.storage_ = storage;
  }

  /**
   * Initialize (if necessary) source data
   */
  async init(): Promise<void> {
    if (this.inited_) {
      return;
    }
    this.inited_ = true;
    this.storage_.storageChangeSourcesHook = this.applySourceOptions.bind(this);

    await this.applySourceOptions();
  }

  /**
   * Get the IP version ID that should be automatically enabled if the user attempts to un-select
   * all versions in Options
   */
  getDefaultVersion(): IpVersionIndex {
    return (
      getTypedKeys(this.data_).find((version) => {
        return this.data_[version].default;
      }) || IpVersionIndex.V4 // should not get here
    );
  }

  /**
   * Get an array of all known IP version IDs
   */
  getVersions(): IpVersionIndex[] {
    return getTypedKeys(this.data_);
  }

  /**
   * Get all data for a specific IP version
   * @param version IP version
   */
  getVersionData(version?: IpVersionIndex): IPvxSourceData {
    if (!version || !this.getVersions().includes(version)) {
      throw new Error(`Unrecognized IP version "${version || ''}"`);
    }
    return this.data_[version];
  }

  /**
   * Get info for all sources under a specific IP version
   * @param version IP version
   */
  getSources(version: IpVersionIndex): {[key: string]: IndividualSource} {
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
  getSourceData(version: IpVersionIndex, id: string): IndividualSource {
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
  getDefaultSourceId(version: IpVersionIndex): string {
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
  getSourceIds(version: IpVersionIndex): string[] {
    const sources = this.getSources(version);
    return Object.keys(sources);
  }

  /**
   * Get an array of all known source IDs for a specific IP version sorted by user preference
   * @param version IP version
   */
  getOrderedSourceIds(version: IpVersionIndex): string[] {
    const sources = this.getSources(version);
    return Object.keys(sources).sort((a, b) => sources[a].order - sources[b].order);
  }

  /**
   * Get an array of all enabled source IDs for a specific IP version
   * @param version IP version
   */
  getEnabledSourceIds(version: IpVersionIndex): string[] {
    const sources = this.getSources(version);
    return Object.keys(sources).filter((id) => sources[id].enabled);
  }

  /**
   * Get an array of all enabled source IDs for a specific IP version sorted by user preference
   * @param version IP version
   */
  getOrderedEnabledSourceIds(version: IpVersionIndex): string[] {
    const sources = this.getSources(version);
    return Object.keys(sources)
      .filter((id) => sources[id].enabled)
      .sort((a, b) => sources[a].order - sources[b].order);
  }

  /**
   * Restore original source data
   * @param version IP version
   */
  restoreData(version?: IpVersionIndex): void {
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
   * final size (which is ~40 KB at time of writing).
   */
  async applySourceOptions(): Promise<void> {
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
