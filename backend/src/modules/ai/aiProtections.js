/**
 * AI Protection Utilities:
 * 1. Rate Limiting (10 requests / min / user)
 * 2. In-Memory Query Response Caching (10 min TTL)
 * 3. Usage Logging & Telemetry Tracker
 */

class AiRateLimiter {
  constructor(limit = 10, windowMs = 60 * 1000) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.requests = new Map(); // key -> array of timestamps
  }

  check(key) {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    let timestamps = this.requests.get(key) || [];
    // Filter timestamps outside current window
    timestamps = timestamps.filter((t) => t > windowStart);

    if (timestamps.length >= this.limit) {
      const oldestInWindow = timestamps[0];
      const resetSeconds = Math.ceil((oldestInWindow + this.windowMs - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        resetSeconds: Math.max(1, resetSeconds),
      };
    }

    timestamps.push(now);
    this.requests.set(key, timestamps);

    return {
      allowed: true,
      remaining: this.limit - timestamps.length,
      resetSeconds: Math.ceil(this.windowMs / 1000),
    };
  }
}

class AiCache {
  constructor(ttlMs = 10 * 60 * 1000) {
    this.ttlMs = ttlMs;
    this.cache = new Map(); // normalizedKey -> { response, expiresAt }
  }

  normalizeKey(query) {
    return query
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, ' ');
  }

  get(query) {
    const key = this.normalizeKey(query);
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.payload;
  }

  set(query, payload) {
    const key = this.normalizeKey(query);
    this.cache.set(key, {
      payload,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  clear() {
    this.cache.clear();
  }
}

class AiUsageLogger {
  constructor(maxLogs = 500) {
    this.maxLogs = maxLogs;
    this.logs = [];
    this.stats = {
      totalQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      totalTokensEstimated: 0,
      errorCount: 0,
      geminiCalls: 0,
      fallbackCalls: 0,
    };
  }

  logQuery(entry) {
    const timestamp = new Date().toISOString();
    const tokensIn = entry.tokensIn || Math.ceil((entry.question || '').length / 4);
    const tokensOut = entry.tokensOut || Math.ceil((entry.answer || '').length / 4);
    const totalTokens = tokensIn + tokensOut;

    this.stats.totalQueries += 1;
    this.stats.totalTokensEstimated += totalTokens;

    if (entry.cacheHit) {
      this.stats.cacheHits += 1;
    } else {
      this.stats.cacheMisses += 1;
      if (entry.source === 'gemini') {
        this.stats.geminiCalls += 1;
      } else if (entry.source === 'fallback') {
        this.stats.fallbackCalls += 1;
      }
    }

    if (entry.error) {
      this.stats.errorCount += 1;
    }

    const logItem = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
      timestamp,
      userId: entry.userId || 'anonymous',
      question: entry.question,
      intent: entry.intent || 'unknown',
      source: entry.source || (entry.cacheHit ? 'cache' : 'fallback'),
      cacheHit: !!entry.cacheHit,
      tokensIn,
      tokensOut,
      totalTokens,
      latencyMs: entry.latencyMs || 0,
      error: entry.error || null,
    };

    this.logs.unshift(logItem);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }
  }

  getStats() {
    const latencies = this.logs.map((l) => l.latencyMs).filter((l) => l > 0);
    const avgLatencyMs = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
    const hitRatePercent =
      this.stats.totalQueries > 0
        ? Math.round((this.stats.cacheHits / this.stats.totalQueries) * 100)
        : 0;

    return {
      ...this.stats,
      avgLatencyMs,
      hitRatePercent,
      recentLogs: this.logs.slice(0, 50),
    };
  }
}

const rateLimiter = new AiRateLimiter(10, 60 * 1000);
const cache = new AiCache(10 * 60 * 1000);
const usageLogger = new AiUsageLogger(500);

module.exports = {
  rateLimiter,
  cache,
  usageLogger,
};
