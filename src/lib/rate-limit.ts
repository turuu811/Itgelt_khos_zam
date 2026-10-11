import 'server-only';

// Энгийн, санах ойд суурилсан хязгаарлагч. Нэг сервер (нэг VPS) дээр хангалттай.
// Олон instance болвол Redis зэрэгт шилжүүлнэ.
type Entry = { count: number; resetAt: number };
const store = new Map<string, Entry>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean } {
  const now = Date.now();

  if (store.size > 5000) {
    for (const [k, v] of store) if (v.resetAt <= now) store.delete(k);
  }

  const entry = store.get(key);
  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  entry.count += 1;
  return { ok: entry.count <= limit };
}

export function resetRateLimit(key: string) {
  store.delete(key);
}
