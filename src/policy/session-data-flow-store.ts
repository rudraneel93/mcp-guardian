/**
 * Session-scoped tool-call history for cross-request data-flow analysis.
 * In-memory LRU per process; Redis when HA env is configured (multi-replica).
 */
import { LRUCache } from 'lru-cache';
import type { Redis, Cluster } from 'ioredis';
import { Logger } from '../utils/logger.js';
import { getGuardianRegion } from '../utils/region.js';
import { createRedisClient, getRedisConnectionLabel, isRedisConfigured } from '../utils/redis-client.js';
import { DEFAULT_TENANT_ID } from '../tenant/resolve-tenant.js';
import type { CallDataFlowSignals } from './call-signal-extractor.js';
import type { CallContext } from './policy-types.js';

export interface SessionDataFlowSnapshot {
  calls: CallDataFlowSignals[];
  lastUpdated: number;
}

export interface SessionDataFlowStore {
  getSnapshot(sessionKey: string, tenantId?: string): Promise<SessionDataFlowSnapshot>;
  appendCall(sessionKey: string, signals: CallDataFlowSignals, tenantId?: string): Promise<void>;
  clear(sessionKey: string, tenantId?: string): Promise<void>;
}

function maxCalls(): number {
  const n = parseInt(process.env.GUARDIAN_DATA_FLOW_MAX_CALLS || '64', 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 256) : 64;
}

function ttlMs(): number {
  const n = parseInt(process.env.GUARDIAN_DATA_FLOW_TTL_MS || '3600000', 10);
  return Number.isFinite(n) && n > 0 ? n : 3600000;
}

export function resolveSessionKey(ctx: CallContext): string {
  if (ctx.sessionKey) return ctx.sessionKey;
  const parts = [
    ctx.tenantId || DEFAULT_TENANT_ID,
    ctx.serverName,
    ctx.sessionId || 'default-session',
    ctx.agentIdentity?.sub || 'anonymous',
    ctx.agentIdentity?.clientId || '',
  ];
  return parts.join(':');
}

export class MemorySessionDataFlowStore implements SessionDataFlowStore {
  private cache = new LRUCache<string, SessionDataFlowSnapshot>({
    max: parseInt(process.env.GUARDIAN_DATA_FLOW_MAX_SESSIONS || '10000', 10) || 10000,
    ttl: ttlMs(),
  });

  async getSnapshot(sessionKey: string): Promise<SessionDataFlowSnapshot> {
    return this.cache.get(sessionKey) ?? { calls: [], lastUpdated: 0 };
  }

  async appendCall(sessionKey: string, signals: CallDataFlowSignals): Promise<void> {
    const prev = await this.getSnapshot(sessionKey);
    const calls = [...prev.calls, signals].slice(-maxCalls());
    this.cache.set(sessionKey, { calls, lastUpdated: Date.now() });
  }

  async clear(sessionKey: string): Promise<void> {
    this.cache.delete(sessionKey);
  }
}

export class RedisSessionDataFlowStore implements SessionDataFlowStore {
  private redis: Redis | Cluster;
  private prefix: string;

  constructor() {
    if (!isRedisConfigured()) {
      throw new Error('RedisSessionDataFlowStore requires Redis configuration');
    }
    this.prefix = `mcp_guardian:dataflow:${getGuardianRegion()}:`;
    this.redis = createRedisClient({ maxRetriesPerRequest: 2, lazyConnect: false });
    Logger.info(`[session-data-flow] Redis store (${getRedisConnectionLabel()})`);
  }

  private key(sessionKey: string, tenantId?: string): string {
    return `${this.prefix}${tenantId || DEFAULT_TENANT_ID}:${sessionKey}`;
  }

  async getSnapshot(sessionKey: string, tenantId?: string): Promise<SessionDataFlowSnapshot> {
    try {
      const raw = await this.redis.get(this.key(sessionKey, tenantId));
      if (!raw) return { calls: [], lastUpdated: 0 };
      return JSON.parse(raw) as SessionDataFlowSnapshot;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      Logger.warn(`[session-data-flow] Redis get failed: ${message}`);
      return { calls: [], lastUpdated: 0 };
    }
  }

  async appendCall(sessionKey: string, signals: CallDataFlowSignals, tenantId?: string): Promise<void> {
    const prev = await this.getSnapshot(sessionKey, tenantId);
    const calls = [...prev.calls, signals].slice(-maxCalls());
    const snapshot: SessionDataFlowSnapshot = { calls, lastUpdated: Date.now() };
    const ttlSec = Math.ceil(ttlMs() / 1000);
    try {
      await this.redis.setex(this.key(sessionKey, tenantId), ttlSec, JSON.stringify(snapshot));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      Logger.warn(`[session-data-flow] Redis set failed: ${message}`);
    }
  }

  async clear(sessionKey: string, tenantId?: string): Promise<void> {
    try {
      await this.redis.del(this.key(sessionKey, tenantId));
    } catch {
      /* ignore */
    }
  }

  async close(): Promise<void> {
    try {
      await this.redis.quit();
    } catch {
      /* ignore */
    }
  }
}

let sharedStore: SessionDataFlowStore | null = null;
let sharedRedisStore: RedisSessionDataFlowStore | null = null;

export function isDataFlowEnabled(configFlag?: boolean): boolean {
  if (process.env.GUARDIAN_DATA_FLOW === 'false') return false;
  if (process.env.GUARDIAN_DATA_FLOW === 'true') return true;
  if (configFlag === false) return false;
  return true;
}

export function getSessionDataFlowStore(): SessionDataFlowStore {
  if (!sharedStore) {
    if (process.env.GUARDIAN_DATA_FLOW_REDIS === 'true' && isRedisConfigured()) {
      sharedRedisStore = new RedisSessionDataFlowStore();
      sharedStore = sharedRedisStore;
    } else {
      sharedStore = new MemorySessionDataFlowStore();
    }
  }
  return sharedStore;
}

/** @internal */
export function resetSessionDataFlowStoreForTests(): void {
  if (sharedRedisStore) void sharedRedisStore.close();
  sharedStore = null;
  sharedRedisStore = null;
}
