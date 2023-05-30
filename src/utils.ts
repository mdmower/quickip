/**
 * Determine whether a variable is a record-type object (excluding functions, arrays, and null)
 * @param val Candidate value
 */
export function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && !!val && !Array.isArray(val);
}

/**
 * Get typed object keys
 * @param obj Object with known key types
 */
export function getTypedKeys<T extends object>(obj: T): Array<keyof T> {
  return Object.keys(obj) as Array<keyof typeof obj>;
}
