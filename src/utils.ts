import {DisplayTheme, IpVersionIndex, StorageSourceStatesIndex} from './interfaces';

/**
 * Determine whether a variable is a record-type object (excluding functions, arrays, and null)
 * @param val Candidate value
 */
export function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && !!val && !Array.isArray(val);
}

/**
 * Determine whether a variable is a valid DisplayTheme
 * @param val Candidate value
 */
export function isDisplayTheme(val: unknown): val is DisplayTheme {
  return typeof val === 'string' && Object.values<string>(DisplayTheme).includes(val);
}

/**
 * Get typed object keys
 * @param obj Object with known key types
 */
export function getTypedKeys<T extends object>(obj: T): Array<keyof T> {
  return Object.keys(obj) as Array<keyof typeof obj>;
}

/**
 * Stringify an error
 * @param error Thrown error
 */
export function getErrorMessage(error: unknown): string {
  if (!error) {
    return '';
  }

  if (error instanceof Error) {
    return error.message;
  }

  try {
    return error.toString();
  } catch (ex) {
    return String(error);
  }
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
