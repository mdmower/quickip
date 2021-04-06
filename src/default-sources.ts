/**
 * @license Apache-2.0
 */

import {
  IPvxSourceData,
  IpVersionIndex,
  SourceData,
  StorageData,
  StorageSourceStates,
  StorageVersionStates,
} from './interfaces';
import {getTypedKeys} from './utils';

const defaultSources: SourceData = {
  v4: {
    name: 'IPv4',
    id: 'v4',
    default: true,
    enabled: true,
    sources: {
      identme: {
        id: 'identme',
        url: 'https://v4.ident.me',
        name: 'ident.me',
        order: 3,
        default: false,
        enabled: true,
      },
      ipify: {
        id: 'ipify',
        url: 'https://api.ipify.org',
        name: 'ipify',
        order: 1,
        default: false,
        enabled: true,
      },
      icanhazip: {
        id: 'icanhazip',
        url: 'https://ipv4.icanhazip.com',
        name: 'ICanHazIP',
        order: 0,
        default: true,
        enabled: true,
      },
      wtfismyip: {
        id: 'wtfismyip',
        url: 'https://ipv4.wtfismyip.com/text',
        name: 'WTF is my IP?!?!??',
        order: 2,
        default: false,
        enabled: true,
      },
    },
  },
  v6: {
    name: 'IPv6',
    id: 'v6',
    default: false,
    enabled: true,
    sources: {
      identme: {
        id: 'identme',
        url: 'https://v6.ident.me',
        name: 'ident.me',
        order: 2,
        default: false,
        enabled: true,
      },
      icanhazip: {
        id: 'icanhazip',
        url: 'https://ipv6.icanhazip.com',
        name: 'ICanHazIP',
        order: 0,
        default: true,
        enabled: true,
      },
      wtfismyip: {
        id: 'wtfismyip',
        url: 'https://ipv6.wtfismyip.com/text',
        name: 'WTF is my IP?!?!??',
        order: 1,
        default: false,
        enabled: true,
      },
      ipify: {
        id: 'ipify',
        url: 'https://api6.ipify.org',
        name: 'ipify',
        order: 3,
        default: false,
        enabled: true,
      },
    },
  },
};

/**
 * Get all default sources data
 */
export function getDefaultSourcesData(): SourceData {
  return JSON.parse(JSON.stringify(defaultSources)) as SourceData;
}

/**
 * Get default sources data for a specific IP version
 * @param version IP version
 */
export function getDefaultSourcesDataForVersion(version: IpVersionIndex): IPvxSourceData {
  if (!version || !getTypedKeys(defaultSources).includes(version)) {
    throw new Error(`Unrecognized IP version "${version}"`);
  }
  return JSON.parse(JSON.stringify(defaultSources[version])) as IPvxSourceData;
}

/**
 * Get all default storage data
 */
export function getDefaultStorageData(): StorageData {
  const defaultSourcesData = getDefaultSourcesData();

  const getDefaultStorageVersionStates = (): StorageVersionStates => {
    return getTypedKeys(defaultSourcesData).reduce((obj, version) => {
      const versionData = defaultSourcesData[version];
      if (versionData) {
        obj[version] = versionData.enabled;
      }
      return obj;
    }, <StorageVersionStates>{});
  };

  const getDefaultStorageSourceStates = (version: IpVersionIndex): StorageSourceStates => {
    return Object.keys(defaultSourcesData[version].sources).reduce((vobj, name) => {
      const sourcesData = defaultSourcesData[version].sources[name];
      if (sourcesData) {
        vobj[name] = {
          enabled: sourcesData.enabled,
          order: sourcesData.order,
        };
      }
      return vobj;
    }, <StorageSourceStates>{});
  };

  return {
    version_states: getDefaultStorageVersionStates(),
    source_states_v4: getDefaultStorageSourceStates(IpVersionIndex.V4),
    source_states_v6: getDefaultStorageSourceStates(IpVersionIndex.V6),
  };
}
