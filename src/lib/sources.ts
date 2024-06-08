/**
 * @license Apache-2.0
 */

import defaultSourcesData from './default-sources.json';
import {
  IPvxSourceData,
  IndividualSource,
  IpVersionIndex,
  SourceData,
  StorageSourceStatesIndex,
  VersionStatesIndex,
} from './interfaces';
import {getStorageData} from './storage';
import {getIpVersionFromSSSI, getTypedKeys} from './utils';

/**
 * Get the IP version ID that should be automatically enabled if the user attempts to un-select
 * all versions in Options
 */
export function getDefaultVersion(): IpVersionIndex {
  const defaultSourcesData = getDefaultSourcesData();
  const defaultVersion = getTypedKeys(defaultSourcesData).find(
    (version) => defaultSourcesData[version].default
  );
  return defaultVersion ?? IpVersionIndex.V4;
}

/**
 * Get an array of all known IP version IDs
 */
export function getVersions(): IpVersionIndex[] {
  return Object.values(IpVersionIndex);
}

/**
 * Get all data for a specific IP version
 * @param version IP version
 */
export async function getVersionData(version: IpVersionIndex): Promise<IPvxSourceData> {
  const sourcesData = await getSourcesData();
  return sourcesData[version];
}

/**
 * Get info for all sources under a specific IP version
 * @param version IP version
 */
export async function getSources(
  version: IpVersionIndex
): Promise<Record<string, IndividualSource | undefined>> {
  const versionData = await getVersionData(version);
  return versionData.sources;
}

/**
 * Get the default source that should be automatically enabled if the user attempts to
 * un-select all sources for a specific IP version in Options
 * @param version IP version
 */
export function getDefaultSource(version: IpVersionIndex): IndividualSource {
  const defaultSources = getDefaultSourcesData()[version];
  const defaultSource = Object.values(defaultSources.sources).find((source) => source?.default);
  if (!defaultSource) {
    throw new Error('No default source has been defined');
  }
  return defaultSource;
}

/**
 * Get an array of all known sources for a specific IP version sorted by user preference
 * @param version IP version
 */
export async function getOrderedSources(version: IpVersionIndex): Promise<IndividualSource[]> {
  const sources = await getSources(version);
  return Object.values(sources)
    .filter((source): source is IndividualSource => !!source)
    .sort((a, b) => a.order - b.order);
}

/**
 * Get an array of all enabled sources for a specific IP version
 * @param version IP version
 */
export async function getEnabledSources(version: IpVersionIndex): Promise<IndividualSource[]> {
  const sources = await getSources(version);
  return Object.values(sources)
    .filter((source): source is IndividualSource => !!source)
    .filter((source) => source.enabled);
}

/**
 * Get an array of all enabled sources for a specific IP version sorted by user preference
 * @param version IP version
 */
export async function getOrderedEnabledSources(
  version: IpVersionIndex
): Promise<IndividualSource[]> {
  const sources = await getSources(version);
  return Object.values(sources)
    .filter((source): source is IndividualSource => !!source)
    .filter((source) => source.enabled)
    .sort((a, b) => a.order - b.order);
}

/**
 * Get all default sources data
 */
export function getDefaultSourcesData(): SourceData {
  return JSON.parse(JSON.stringify(defaultSourcesData)) as SourceData;
}

/**
 * Safely overlay default sources data with user sources data
 */
export async function getSourcesData(): Promise<SourceData> {
  const storageData = await getStorageData();
  const sourcesData = getDefaultSourcesData();

  for (const version of getTypedKeys(sourcesData)) {
    sourcesData[version].enabled = storageData[VersionStatesIndex][version];
  }

  for (const sssi of Object.values(StorageSourceStatesIndex)) {
    const version = getIpVersionFromSSSI(sssi);
    for (const sourceId of Object.keys(sourcesData[version].sources)) {
      const storageSourceData = storageData[sssi][sourceId];
      const targetSourceData = sourcesData[version].sources[sourceId];
      if (storageSourceData && targetSourceData) {
        targetSourceData.enabled = storageSourceData.enabled;
        targetSourceData.order = storageSourceData.order;
      }
    }
  }

  return sourcesData;
}
