interface CachedReceipt {
  createdAtMs: number;
  payload: Record<string, unknown>;
}

const MEMORY_RECEIPTS = new Map<string, CachedReceipt>();
const IN_FLIGHT_KEYS = new Set<string>();
const TTL_MS = 24 * 60 * 60 * 1000;

function cleanupExpired(): void {
  const now = Date.now();
  for (const [k, v] of MEMORY_RECEIPTS.entries()) {
    if (now - v.createdAtMs > TTL_MS) {
      MEMORY_RECEIPTS.delete(k);
    }
  }
}

export function normalizeIdempotencyKey(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.trim().replace(/[^a-zA-Z0-9_-]/g, "");
  if (cleaned.length < 8 || cleaned.length > 80) return null;
  return cleaned;
}

export function getCachedIdempotentResult(
  uid: string,
  operation: string,
  key: string
): Record<string, unknown> | null {
  cleanupExpired();
  const composite = `${uid}:${operation}:${key}`;
  const entry = MEMORY_RECEIPTS.get(composite);
  return entry ? entry.payload : null;
}

export function acquireInFlightLock(
  uid: string,
  operation: string,
  key: string
): boolean {
  const composite = `${uid}:${operation}:${key}`;
  if (IN_FLIGHT_KEYS.has(composite)) {
    return false;
  }
  IN_FLIGHT_KEYS.add(composite);
  return true;
}

export function releaseInFlightLock(
  uid: string,
  operation: string,
  key: string
): void {
  IN_FLIGHT_KEYS.delete(`${uid}:${operation}:${key}`);
}

export function saveIdempotentResult(
  uid: string,
  operation: string,
  key: string,
  payload: Record<string, unknown>
): void {
  cleanupExpired();
  MEMORY_RECEIPTS.set(`${uid}:${operation}:${key}`, {
    createdAtMs: Date.now(),
    payload,
  });
}
