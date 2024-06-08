import {isIPv4, isIPv6} from 'is-ip';
import {IpVersionIndex} from './interfaces';
import {getDefaultSource, getOrderedEnabledSources} from './sources';
import {logError, logInfo, logWarn} from './logger';
import {getErrorMessage, isRecord} from './utils';

const fetchTimeout = 5000;

/**
 * Fetch IP, cycling through the provided sources until a valid response is found
 * @param version IP version
 */
export async function getIp(version: IpVersionIndex): Promise<string | undefined> {
  let sources = await getOrderedEnabledSources(version);
  if (!sources.length) {
    sources = [getDefaultSource(version)];
  }

  for (const source of sources) {
    const url = source.url;
    logInfo(`getIp: Checking source ${url}`);

    try {
      const response = await fetch(url, {
        credentials: 'omit',
        cache: 'no-store',
        signal: AbortSignal.timeout(fetchTimeout),
      });
      const ip = (await response.text()).trim();
      const validIp = version === IpVersionIndex.V6 ? isIPv6(ip) : isIPv4(ip);
      if (validIp) {
        return ip;
      }
      logWarn(`getIp: Invalid response from ${url}`);
    } catch (ex) {
      if (isRecord(ex) && ex.name === 'TimeoutError') {
        logWarn(`getIp: Request timed out for ${url}`);
      } else if (isRecord(ex) && ex.name === 'AbortError') {
        logWarn(`getIp: Request aborted by user for ${url}`);
      } else {
        logWarn(`getIp: Request failed for ${url}\n`, getErrorMessage(ex));
      }
    }
  }

  logError(`getIp: Could not find IP${version}. Network down or unsupported IP version?`);
}
