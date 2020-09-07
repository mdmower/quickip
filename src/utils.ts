/**
 * Test whether a variable is an object
 * @param obj Candidate
 */
export function isObject(obj: any): boolean {
  const type = typeof obj;
  return (type === 'function' || type === 'object') && Boolean(obj);
}

/**
 * Get typed object keys
 * @param obj Object with known key types
 */
export function getTypedKeys<T>(obj: T): Array<keyof T> {
  return Object.keys(obj) as Array<keyof typeof obj>;
}
