import { Request, Response, NextFunction } from "express";
import { logger } from "@repo/shared/logger";

const BAN_DURATIONS_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 60 * 60_000];

const BAN_DECAY_MS = 24 * 60 * 60_000;

interface AbuseEntry {
  count: number;
  windowStart: number;
  bannedUntil: number;
  banCount: number;
  lastBanAt: number;
}

interface AbuseProtectionConfig {
  windowMs: number;
  maxRequests: number;
}

export function createAbuseProtection(config: AbuseProtectionConfig) {
  const store = new Map<string, AbuseEntry>();

  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      const windowDead = now - entry.windowStart > config.windowMs * 2;
      const banExpired = entry.bannedUntil <= now;
      const banDecayed = entry.banCount === 0 || now - entry.lastBanAt > BAN_DECAY_MS;
      if (windowDead && banExpired && banDecayed) store.delete(key);
    }
  }, 5 * 60_000);

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const entry = store.get(key);

    if (entry && entry.bannedUntil > now) {
      const retryAfter = Math.ceil((entry.bannedUntil - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({
        error: "Too many requests. You've been temporarily blocked.",
        retryAfterSeconds: retryAfter,
      });
    }

    if (!entry) {
      store.set(key, {
        count: 1,
        windowStart: now,
        bannedUntil: 0,
        banCount: 0,
        lastBanAt: 0,
      });
      return next();
    }

    if (now - entry.windowStart > config.windowMs) {
      entry.count = 1;
      entry.windowStart = now;
      if (entry.lastBanAt > 0 && now - entry.lastBanAt > BAN_DECAY_MS) {
        entry.banCount = 0;
      }
      return next();
    }

    entry.count++;

    if (entry.count > config.maxRequests) {
      const tier = Math.min(entry.banCount, BAN_DURATIONS_MS.length - 1);
      const duration = BAN_DURATIONS_MS[tier]!;
      entry.bannedUntil = now + duration;
      entry.banCount++;
      entry.lastBanAt = now;

      const retryAfter = Math.ceil(duration / 1000);
      logger.warn(`Abuse blocked: ${key} banned ${retryAfter}s (strike ${entry.banCount})`);

      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({
        error: "Too many requests. You've been temporarily blocked.",
        retryAfterSeconds: retryAfter,
      });
    }

    next();
  };
}

interface SocketAbuseEntry {
  count: number;
  resetAt: number;
  violations: number;
  bannedUntil: number;
  lastViolationAt: number;
}

export function createSocketAbuseProtection(maxEventsPerSecond: number) {
  const store = new Map<string, SocketAbuseEntry>();

  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      const idle = entry.resetAt <= now && entry.bannedUntil <= now;
      const decayed = entry.violations === 0 || now - entry.lastViolationAt > BAN_DECAY_MS;
      if (idle && decayed) store.delete(key);
    }
  }, 60_000);

  return (socketId: string): boolean => {
    const now = Date.now();
    const entry = store.get(socketId);

    if (entry && entry.bannedUntil > now) return false;

    if (!entry) {
      store.set(socketId, {
        count: 1,
        resetAt: now + 1000,
        violations: 0,
        bannedUntil: 0,
        lastViolationAt: 0,
      });
      return true;
    }

    if (entry.resetAt <= now) {
      entry.count = 1;
      entry.resetAt = now + 1000;
      if (entry.lastViolationAt > 0 && now - entry.lastViolationAt > BAN_DECAY_MS) {
        entry.violations = 0;
      }
      return true;
    }

    entry.count++;

    if (entry.count > maxEventsPerSecond) {
      entry.violations++;
      entry.lastViolationAt = now;

      if (entry.violations >= 3 && entry.violations % 3 === 0) {
        const tier = Math.min(Math.floor(entry.violations / 3) - 1, BAN_DURATIONS_MS.length - 1);
        const duration = BAN_DURATIONS_MS[tier]!;
        entry.bannedUntil = now + duration;
        logger.warn(
          `Socket abuse: ${socketId} banned ${Math.ceil(duration / 1000)}s (${entry.violations} violations)`,
        );
      }
      return false;
    }

    return true;
  };
}
