import type { NextFunction, Request, Response } from "express";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

function makeRateLimiter(maxRequests: number, windowMs: number) {
  const store = new Map<string, RateLimitEntry>();

  // Periodically clear expired entries to avoid memory leak
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key);
    }
  }, windowMs).unref();

  return function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.socket.remoteAddress ?? "unknown";
    const now = Date.now();
    const entry = store.get(ip);

    if (!entry || now > entry.resetAt) {
      store.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count += 1;

    if (entry.count > maxRequests) {
      res.setHeader("Retry-After", Math.ceil((entry.resetAt - now) / 1000));
      return res.status(429).json({
        success: false,
        data: null,
        error: `Rate limit exceeded. Max ${maxRequests} requests per ${windowMs / 1000}s window.`
      });
    }

    return next();
  };
}

/** 20 requests per minute — for AI-heavy endpoints. */
export const aiRateLimit = makeRateLimiter(20, 60_000);

/** 200 requests per minute — applied globally. */
export const globalRateLimit = makeRateLimiter(200, 60_000);
