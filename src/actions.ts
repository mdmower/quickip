import isIp from 'is-ip';

import {IpVersionIndex} from './interfaces';
import {QipSources} from './sources';

export default class QipActions {
  private inited_: boolean;
  private sources_: QipSources;

  constructor(sources: QipSources) {
    this.inited_ = false;
    this.sources_ = sources;
  }

  /**
   * Initialize (if necessary) actions
   */
  async init(): Promise<void> {
    if (this.inited_) {
      return;
    }
    this.inited_ = true;

    return Promise.resolve();
  }

  /**
   * Fetch an IP, cycling through ordered sources whenever a request fails until all enabled sources
   * are exhausted
   * @param version IP version
   * @param ids Source IDs
   * @param attempt Zero-indexed attempt number
   */
  async requestIP(version: IpVersionIndex, ids: string[], attempt: number): Promise<string> {
    if (attempt >= ids.length) {
      throw new Error(
        `requestIP: Attempt #${attempt} exceeds number of enabled sources; network down?`
      );
    }

    const urls = ids.map((id) => this.sources_.getSourceData(version, id).url);
    const url = urls[attempt];
    console.log(`requestIP: Checking source ${url}`);

    // Prepare for next iteration, if necessary
    attempt += 1;

    return fetch(url, {cache: 'no-store'})
      .then((response) => response.text())
      .then((ip) => {
        ip = ip.trim();
        const validIp = version === IpVersionIndex.V6 ? isIp.v6(ip) : isIp.v4(ip);
        if (!validIp) {
          console.log(`requestIP: Invalid response from ${url}`);
          return this.requestIP(version, ids, attempt);
        }
        return ip;
      })
      .catch((error) => {
        console.log(`requestIP: Request failed for ${url}\n`, error);
        return this.requestIP(version, ids, attempt);
      });
  }
}

export {QipActions};
