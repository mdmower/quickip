/**
 * Determine whether a variable is an object (excluding functions, arrays, and null)
 * @param obj Candidate object
 */
export function isObject(obj: unknown): boolean {
  return typeof obj === 'object' && !!obj && !Array.isArray(obj);
}

/**
 * Assert variable is an object or throw
 * @param obj Candidate object
 */
export function assertObject(obj: unknown): Record<string, unknown> {
  if (isObject(obj)) {
    return <Record<string, unknown>>obj;
  }
  throw new Error('Not an object');
}

/**
 * Get typed object keys
 * @param obj Object with known key types
 */
export function getTypedKeys<T>(obj: T): Array<keyof T> {
  return Object.keys(obj) as Array<keyof typeof obj>;
}
