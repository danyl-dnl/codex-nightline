const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000;
const MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 12;
const CACHE_TTL_MS = Number(process.env.TRIAL_CACHE_TTL_MS) || 5 * 60_000;
const MAX_CACHE_ENTRIES = 100;

export function createRateLimiter({ windowMs, maxRequests, now = () => Date.now() }) {
  const buckets = new Map();
  return (key) => {
    const timestamp = now();
    const bucket = (buckets.get(key) || []).filter((entry) => timestamp - entry < windowMs);
    if (bucket.length >= maxRequests) return false;
    bucket.push(timestamp);
    buckets.set(key, bucket);
    return true;
  };
}

export function createTtlCache({ ttlMs, maxEntries, now = () => Date.now() }) {
  const cache = new Map();
  return {
    get(key) {
      const item = cache.get(key);
      if (!item || now() - item.createdAt > ttlMs) {
        cache.delete(key);
        return null;
      }
      return item.value;
    },
    set(key, value) {
      if (cache.size >= maxEntries && !cache.has(key)) cache.delete(cache.keys().next().value);
      cache.set(key, { createdAt: now(), value });
    },
  };
}

const allow = createRateLimiter({ windowMs: WINDOW_MS, maxRequests: MAX_REQUESTS });
const cache = createTtlCache({ ttlMs: CACHE_TTL_MS, maxEntries: MAX_CACHE_ENTRIES });

export function allowRequest(key) {
  return allow(key);
}

export function getCachedTrial(key) {
  return cache.get(key);
}

export function cacheTrial(key, value) {
  cache.set(key, value);
}

export function logTrial(event, details) {
  console.info(JSON.stringify({ service: "fair-price", event, ...details, at: new Date().toISOString() }));
}
