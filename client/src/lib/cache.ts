const CACHE_VERSION = 'v2';
const CACHE_PREFIX = `yunqi_cache_${CACHE_VERSION}_`;
const DEFAULT_TTL = 5 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

function checkCacheVersion() {
  try {
    const versionKey = 'yunqi_cache_version';
    const currentVersion = localStorage.getItem(versionKey);
    if (currentVersion !== CACHE_VERSION) {
      const keys = Object.keys(localStorage);
      keys.forEach(k => {
        if (k.startsWith('yunqi_cache_')) {
          localStorage.removeItem(k);
        }
      });
      localStorage.setItem(versionKey, CACHE_VERSION);
    }
  } catch {
    // ignore
  }
}

checkCacheVersion();

export function getCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    
    const entry: CacheEntry<T> = JSON.parse(raw);
    const now = Date.now();
    
    if (now - entry.timestamp > entry.ttl) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    
    return entry.data;
  } catch {
    return null;
  }
}

export function setCache<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
  }
}

export function clearCache(key?: string): void {
  if (key) {
    localStorage.removeItem(CACHE_PREFIX + key);
  } else {
    const keys = Object.keys(localStorage);
    keys.forEach(k => {
      if (k.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(k);
      }
    });
  }
}
