/**
 * @license Apache-2.0
 */

/**
 * Supported IP versions
 */
export enum IpVersionIndex {
  V4 = 'v4',
  V6 = 'v6',
}

/**
 * Storage keys for source states of supported IP versions
 */
export enum StorageSourceStatesIndex {
  V4 = 'source_states_v4',
  V6 = 'source_states_v6',
}

/**
 * Storage key for IP version states
 */
export const VersionStatesIndex = 'version_states';

/**
 * Information about an individual source
 */
export interface IndividualSource {
  id: string;
  url: string;
  name: string;
  order: number;
  default: boolean;
  enabled: boolean;
}

/**
 * Collection of information about all sources for a specific IP version
 */
export interface IPvxSourceData {
  id: string;
  name: string;
  default: boolean;
  enabled: boolean;
  sources: {[source_id: string]: IndividualSource | undefined};
}

/**
 * Collection of information about all sources for all IP versions
 */
export type SourceData = {
  [version in IpVersionIndex]: IPvxSourceData;
};

/**
 * IP version states in Chrome storage
 */
export type StorageVersionStates = {
  [version in IpVersionIndex]: boolean;
};

/**
 * Information about an individual source in Chrome storage
 */
export interface IndividualStorageSourceState {
  order: number;
  enabled: boolean;
}

/**
 * Collection of information about all sources in Chrome storage for a specific IP version
 */
export interface StorageSourceStates {
  [source_id: string]: IndividualStorageSourceState | undefined;
}

/**
 * Data in Chrome storage
 */
export type StorageData = {
  [name in typeof VersionStatesIndex]: StorageVersionStates;
} & {
  [name in StorageSourceStatesIndex]: StorageSourceStates;
};

/**
 * Get all supported IP versions
 */
export function getKnownIpVersions(): IpVersionIndex[] {
  return [IpVersionIndex.V4, IpVersionIndex.V6];
}

/**
 * Get typed IP version from string
 * @param version IP version string (v4 or v6)
 */
export function getIpVersion(version: string): IpVersionIndex {
  if (version === IpVersionIndex.V4 || version === IpVersionIndex.V6) {
    return version;
  }
  throw new Error(`Could not identify IP version index from string "${version}"`);
}

/**
 * Get IP version corresponding to a storage sources state index
 * @param sssi Storage sources state index
 */
export function getIpVersionFromSSSI(sssi: StorageSourceStatesIndex): IpVersionIndex {
  if (sssi === StorageSourceStatesIndex.V4) {
    return IpVersionIndex.V4;
  }
  if (sssi === StorageSourceStatesIndex.V6) {
    return IpVersionIndex.V6;
  }
  throw new Error(
    `Could not identify IP version index from StorageSourceStatesIndex "${String(sssi)}"`
  );
}

/**
 * Get storage sources state index corresponding to an IP version
 * @param version IP version
 */
export function getStorageSourceStatesIndex(version: IpVersionIndex): StorageSourceStatesIndex {
  if (version === IpVersionIndex.V4) {
    return StorageSourceStatesIndex.V4;
  }
  if (version === IpVersionIndex.V6) {
    return StorageSourceStatesIndex.V6;
  }
  throw new Error(
    `Could not identify storage source states key from IP version "${String(version)}"`
  );
}
