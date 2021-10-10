/**
 * Determine whether a variable is an object (excluding functions, arrays, and null)
 * @param obj Candidate object
 */
export function isObject(obj: unknown): boolean {
  return typeof obj === 'object' && !!obj && !Array.isArray(obj);
}

/**
 * Get typed object keys
 * @param obj Object with known key types
 */
export function getTypedKeys<T>(obj: T): Array<keyof T> {
  return Object.keys(obj) as Array<keyof typeof obj>;
}
