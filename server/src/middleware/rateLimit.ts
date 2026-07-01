import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

function getStore(prefix: string): Map<string, RateLimitEntry> {
  if (!stores.has(prefix)) {
    stores.set(prefix, new Map());
  }
  return stores.get(prefix)!;
}

// 清理过期条目，防止内存泄漏
function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [, store] of stores) {
    for (const [key, entry] of store) {
      if (now > entry.resetTime) {
        store.delete(key);
      }
    }
  }
}

// 每5分钟清理一次
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);

export function rateLimit(options: RateLimitOptions) {
  const { windowMs, maxRequests } = options;
  const prefix = `${windowMs}-${maxRequests}`;
  const store = getStore(prefix);

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    let entry = store.get(ip);

    if (!entry || now > entry.resetTime) {
      entry = { count: 1, resetTime: now + windowMs };
      store.set(ip, entry);
    } else {
      entry.count++;
    }

    if (entry.count > maxRequests) {
      return res.status(429).json({ error: '请求过于频繁，请稍后再试' });
    }

    next();
  };
}

// 预设: 通用 API 限制 - 100次/15分钟
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 100,
});

// 预设: 认证接口限制 - 10次/15分钟
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
});
