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
 * Bootstrap display theme
 */
export enum DisplayTheme {
  System = 'system',
  Light = 'light',
  Dark = 'dark',
}

/**
 * Storage key for IP version states
 */
export const VersionStatesIndex = 'version_states';

/**
 * Storage key for display theme
 */
export const DisplayThemeSetting = 'theme';

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
  sources: Record<string, IndividualSource | undefined>;
}

/**
 * Collection of information about all sources for all IP versions
 */
export type SourceData = Record<IpVersionIndex, IPvxSourceData>;

/**
 * IP version states in Chrome storage
 */
export type StorageVersionStates = Record<IpVersionIndex, boolean>;

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
export type StorageSourceStates = Record<string, IndividualStorageSourceState | undefined>;

/**
 * Data in Chrome storage
 */
export type StorageData = {
  [DisplayThemeSetting]: DisplayTheme;
  [VersionStatesIndex]: StorageVersionStates;
} & Record<StorageSourceStatesIndex, StorageSourceStates>;
