/**
 * Collision-resistant local ids. No crypto dependency: a millisecond timestamp
 * plus 8 random base-36 characters is unique enough for a single-device store,
 * and the timestamp prefix makes ids sort roughly by creation order.
 */
export function createId(prefix = 'id'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${timestamp}${random}`;
}
