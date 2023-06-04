/**
 * @license Apache-2.0
 */

import {
  DisplayTheme,
  DisplayThemeSetting,
  IpVersionIndex,
  StorageData,
  StorageSourceStates,
  StorageSourceStatesIndex,
  VersionStatesIndex,
} from './interfaces';
import {getDefaultSourcesData} from './sources';
import {getTypedKeys, isDisplayTheme, isRecord} from './utils';

/**
 * Get the value of a stored option
 * @param name Option name
 */
export async function getOption(name: string): Promise<unknown> {
  return (await getOptions([name]))[name];
}

/**
 * Get the values of multiple stored options
 * @param names Option names
 */
export async function getOptions(names?: string[]): Promise<Record<string, unknown>> {
  return chrome.storage.sync.get(names);
}

/**
 * Set the value of an option in storage
 * @param option Option name
 * @param value Option value
 */
export async function setOption(option: string, value: unknown): Promise<void> {
  return setOptions({[option]: value});
}

/**
 * Set the value of multiple options in storage
 * @param options Option name/value pairs
 */
export async function setOptions(options: Record<string, unknown>): Promise<void> {
  return chrome.storage.sync.set(options);
}

/**
 * Clear options from storage
 */
export async function clearOptions(): Promise<void> {
  return chrome.storage.sync.clear();
}

/**
 * Get all default storage data
 */
export function getDefaultStorageData(): StorageData {
  const defaultSourcesData = getDefaultSourcesData();

  const getDefaultStorageSourceStates = (version: IpVersionIndex): StorageSourceStates => {
    return Object.keys(defaultSourcesData[version].sources).reduce<StorageSourceStates>(
      (sourceState, name) => {
        const sourcesData = defaultSourcesData[version].sources[name];
        if (sourcesData) {
          sourceState[name] = {
            enabled: sourcesData.enabled,
            order: sourcesData.order,
          };
        }
        return sourceState;
      },
      {}
    );
  };

  return {
    [DisplayThemeSetting]: DisplayTheme.System,
    [VersionStatesIndex]: {
      [IpVersionIndex.V4]: defaultSourcesData[IpVersionIndex.V4].enabled,
      [IpVersionIndex.V6]: defaultSourcesData[IpVersionIndex.V6].enabled,
    },
    [StorageSourceStatesIndex.V4]: getDefaultStorageSourceStates(IpVersionIndex.V4),
    [StorageSourceStatesIndex.V6]: getDefaultStorageSourceStates(IpVersionIndex.V6),
  };
}

/**
 * Safely overlay default storage data with partial user storage data
 * @param keys Only retrieve the indicated storage keys and leave the remaining
 * settings at their defaults, reducing the amount of data that is requested
 * from the storage service.
 *
 * This is intentionally not exported because it could cause confusion about
 * what can be trusted in the returned object. When `keys` is specified, only
 * those settings can be trusted and the rest are at their default values. Use
 * `getStorageData()` and `getIndividualStorageData()` instead.
 */
async function getPartialStorageData(keys: Array<keyof StorageData>): Promise<StorageData> {
  const userStorageData = await getOptions(keys);
  if (!isRecord(userStorageData) || !Object.keys(userStorageData).length) {
    return getDefaultStorageData();
  }

  // Use default storage data as a reliable tree that can be crawled and look
  // for corresponding properties in user data.
  const storageData = getDefaultStorageData();
  for (const name of getTypedKeys(storageData)) {
    if (name === VersionStatesIndex) {
      const userVersionStates = userStorageData[name];
      if (!isRecord(userVersionStates)) {
        continue;
      }

      const versionStates = storageData[name];
      for (const version of getTypedKeys(versionStates)) {
        const versionEnabled = userVersionStates[version];
        if (typeof versionEnabled === 'boolean') {
          versionStates[version] = versionEnabled;
        }
      }
    } else if (name === DisplayThemeSetting) {
      const userTheme = userStorageData[name];
      if (isDisplayTheme(userTheme)) {
        storageData[name] = userTheme;
      }
    } else if (Object.values(StorageSourceStatesIndex).includes(name)) {
      const userSourceStates = userStorageData[name];
      if (!isRecord(userSourceStates)) {
        continue;
      }

      for (const sourceId of Object.keys(storageData[name])) {
        const userSourceState = userSourceStates[sourceId];
        if (!isRecord(userSourceState)) {
          continue;
        }

        const sourceState = storageData[name][sourceId];
        if (!sourceState) {
          // Won't get here
          continue;
        }

        if (typeof userSourceState.enabled === 'boolean') {
          sourceState.enabled = userSourceState.enabled;
        }
        if (
          typeof userSourceState.order === 'number' &&
          userSourceState.order >= 0 &&
          userSourceState.order < 999
        ) {
          sourceState.order = Math.floor(userSourceState.order);
        }
      }
    }
  }

  return storageData;
}

/**
 * Safely overlay default storage data with user storage data
 */
export async function getStorageData(): Promise<StorageData> {
  const keys = getTypedKeys(getDefaultStorageData());
  return getPartialStorageData(keys);
}

/**
 * Safely overlay an individual default storage data item with user storage data
 * @param key Storage key
 */
export async function getIndividualStorageData<T extends keyof StorageData>(
  key: keyof StorageData
): Promise<StorageData[T]> {
  return (await getPartialStorageData([key]))[key] as StorageData[T];
}
