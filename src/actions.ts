import {isIPv4, isIPv6} from 'is-ip';
import {IpVersionIndex} from './interfaces';
import {QipSources} from './sources';

/**
 * IP actions handling
 */
class QipActions {
  /**
   * IP sources handler
   */
  private sources_: QipSources;

  /**
   * Whether actions have been initialized
   */
  private initialized_: boolean = false;

  /**
   * @param sources IP sources handler
   */
  constructor(sources: QipSources) {
    this.sources_ = sources;
  }

  /**
   * Initialize (if necessary) actions
   */
  public async init(): Promise<void> {
    if (this.initialized_) {
      return;
    }
    this.initialized_ = true;

    return this.sources_.init();
  }

  /**
   * Fetch IP, cycling through the provided sources until a valid response is found
   * @param version IP version
   * @param ids Source IDs
   */
  private async getIpFromSources(
    version: IpVersionIndex,
    ids: string[]
  ): Promise<string | undefined> {
    const urls = ids.map((id) => this.sources_.getSourceData(version, id).url);

    for (let i = 0; i < ids.length; i++) {
      const url = urls[i];
      console.log(`requestIP: Checking source ${url}`);

      try {
        const response = await fetch(url, {cache: 'no-store'});
        const ip = (await response.text()).trim();
        const validIp = version === IpVersionIndex.V6 ? isIPv6(ip) : isIPv4(ip);
        if (validIp) {
          return ip;
        }
        console.warn(`getIpFromSources: Invalid response from ${url}`);
      } catch (ex) {
        console.warn(`getIpFromSources: Request failed for ${url}\n`, ex);
      }
    }

    console.error(
      `getIpFromSources: Attempt #${ids.length} exceeds number of enabled sources; network down?`
    );
  }

  /**
   * Fetch an IP, cycling through sources enabled by the user until a valid response is found
   * @param version IP version
   */
  public async getIP(version: IpVersionIndex): Promise<string | undefined> {
    let ids = this.sources_.getOrderedEnabledSourceIds(version);
    if (!ids.length) {
      ids = [this.sources_.getDefaultSourceId(version)];
    }

    return this.getIpFromSources(version, ids);
  }
}

export {QipActions};
