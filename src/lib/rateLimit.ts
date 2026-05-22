// Rate limiting with Upstash Redis (if configured) or in-memory fallback
// To use Redis: set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars

interface Entry {
  count: number;
  resetAt: number;
}

// In-memory fallback store
const store = new Map<string, Entry>();

// Clean up stale in-memory entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 60_000);

function inMemoryRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

async function upstashRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const url   = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;

  // Use a sliding window with INCR + EXPIRE
  const incrRes = await fetch(`${url}/incr/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const { result: count } = await incrRes.json();

  if (count === 1) {
    // Set expiry only on first increment
    await fetch(`${url}/expire/${encodeURIComponent(key)}/${Math.ceil(windowMs / 1000)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  return count <= limit;
}

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  return inMemoryRateLimit(key, limit, windowMs);
}

// Async version that prefers Upstash when configured
export async function rateLimitAsync(key: string, limit: number, windowMs: number): Promise<boolean> {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      return await upstashRateLimit(key, limit, windowMs);
    } catch {
      // Fall through to in-memory on Redis failure
    }
  }
  return inMemoryRateLimit(key, limit, windowMs);
}
