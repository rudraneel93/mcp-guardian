/**
 * MCP streamable HTTP transport proxy (minimal draft handler).
 * POST /mcp — JSON-RPC batch or single message; policy on tools/call.
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import { randomUUID } from 'crypto';
import { PolicyEngine } from '../policy/policy-engine.js';
import { Logger } from '../utils/logger.js';
import { StructuredLogger } from '../utils/structured-logger.js';
import { resolveTenantContext, InvalidTenantIdError } from '../tenant/resolve-tenant.js';
import { resolveProxyTenantId, JwtTenantRequiredError } from '../tenant/jwt-tenant-binding.js';
import { OAuthValidator } from '../auth/oauth.js';
import { extractDpopProof, validateRequiredDpop } from '../auth/dpop-enforcement.js';
import type { CallContext } from '../policy/policy-types.js';
import type { IDatabase } from '../database/database-interface.js';
import { persistCallRecord } from '../utils/call-record-cost.js';
import { idempotencyKeyFromRequest } from '../policy/idempotency-store.js';

export interface StreamableHttpProxyOptions {
  listenPort: number;
  upstreamBaseUrl: string;
  serverName: string;
  policy?: PolicyEngine;
  db?: IDatabase;
  authValidator?: OAuthValidator;
}

export class StreamableHttpProxyServer {
  private opts: StreamableHttpProxyOptions;
  private httpServer: ReturnType<typeof createServer> | null = null;
  private boundPort = 0;
  /** Fallback session id when clients omit X-MCP-Session-Id. */
  private readonly transportSessionId = randomUUID();

  constructor(opts: StreamableHttpProxyOptions) {
    this.opts = opts;
  }

  getListenPort(): number {
    return this.boundPort;
  }

  async start(): Promise<number> {
    if (this.httpServer) return this.boundPort;
    this.httpServer = createServer((req, res) => {
      void this.handleRequest(req, res);
    });
    await new Promise<void>((resolve, reject) => {
      this.httpServer!.once('error', reject);
      this.httpServer!.listen(this.opts.listenPort, () => {
        this.httpServer!.removeListener('error', reject);
        const addr = this.httpServer!.address();
        this.boundPort = typeof addr === 'object' && addr ? addr.port : this.opts.listenPort;
        Logger.info(
          `[streamable-http:${this.opts.serverName}] Listening on http://127.0.0.1:${this.boundPort}/mcp`,
        );
        resolve();
      });
    });
    return this.boundPort;
  }

  async stop(): Promise<void> {
    if (!this.httpServer) return;
    await new Promise<void>((r) => this.httpServer!.close(() => r()));
    this.httpServer = null;
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const path = (req.url || '/').split('?')[0];
    if (req.method !== 'POST' || path !== '/mcp') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Use POST /mcp for streamable HTTP MCP' }));
      return;
    }

    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const body = Buffer.concat(chunks).toString('utf-8');
    let messages: Record<string, unknown>[];
    try {
      const parsed = JSON.parse(body);
      messages = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
      return;
    }

    const responses: unknown[] = [];
    for (const msg of messages) {
      const blocked = await this.maybeBlockMessage(msg, req);
      if (blocked) {
        responses.push(blocked);
        continue;
      }
      responses.push({
        jsonrpc: '2.0',
        id: msg.id,
        result: { forwarded: true, note: 'upstream relay not configured in minimal handler' },
      });
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(responses.length === 1 ? responses[0] : responses));
  }

  private async maybeBlockMessage(
    msg: Record<string, unknown>,
    req: IncomingMessage,
  ): Promise<Record<string, unknown> | null> {
    if (msg.method !== 'tools/call' || !this.opts.policy) return null;

    let tenantId: string;
    let authenticated = false;
    let jwtTenantId: string | undefined;
    const authHeader = req.headers['authorization'];
    const token = OAuthValidator.extractToken(
      typeof authHeader === 'string' ? authHeader : authHeader?.[0],
    );

    if (token && this.opts.authValidator) {
      const result = await this.opts.authValidator.validate(token);
      if (result.valid && result.identity) {
        authenticated = true;
        jwtTenantId = result.identity.tenantId;
      }
    }

    try {
      tenantId = resolveProxyTenantId({
        headers: req.headers as Record<string, string | string[] | undefined>,
        meta: (msg.params as Record<string, unknown> | undefined)?._meta,
        jwtTenantId,
        authenticated,
      });
    } catch (err) {
      if (err instanceof InvalidTenantIdError || err instanceof JwtTenantRequiredError) {
        return {
          jsonrpc: '2.0',
          id: msg.id,
          error: { code: -32602, message: err.message },
        };
      }
      throw err;
    }

    if (token && this.opts.authValidator) {
      const dpopCheck = await validateRequiredDpop(
        extractDpopProof({ headerDpop: req.headers['dpop'] }),
        'POST',
        `https://streamable/${this.opts.serverName}/mcp`,
        token,
        tenantId,
        this.opts.policy.getMode(),
      );
      if (!dpopCheck.valid) {
        return {
          jsonrpc: '2.0',
          id: msg.id,
          error: { code: -32004, message: dpopCheck.error || 'DPoP validation failed' },
        };
      }
    }

    const params = msg.params as { name?: string; arguments?: Record<string, unknown>; _meta?: Record<string, unknown> } | undefined;
    const context: CallContext = {
      serverName: this.opts.serverName,
      toolName: params?.name || 'unknown',
      arguments: params?.arguments,
      requestId: String(msg.id ?? randomUUID()),
      requestTokens: JSON.stringify(msg).length,
      timestamp: new Date().toISOString(),
      tenantId,
      idempotencyKey: idempotencyKeyFromRequest(params?._meta),
      sessionId: req.headers['x-mcp-session-id']?.toString()
        || req.headers['mcp-session-id']?.toString()
        || this.transportSessionId,
    };

    const decision = await this.opts.policy.evaluateAsync(context);
    if (decision.action === 'block') {
      StructuredLogger.logBlocked({
        event: 'tool_blocked',
        requestId: context.requestId,
        serverName: this.opts.serverName,
        toolName: context.toolName,
        reason: decision.reason,
        rule: decision.rule,
      });
      return {
        jsonrpc: '2.0',
        id: msg.id,
        error: {
          code: -32001,
          message: `Blocked by MCP Guardian policy: ${decision.reason}`,
        },
      };
    }

    if (this.opts.db) {
      persistCallRecord(
        this.opts.db,
        {
          serverName: this.opts.serverName,
          toolName: context.toolName,
          timestamp: context.timestamp,
          requestTokens: context.requestTokens,
          responseTokens: 0,
          totalTokens: context.requestTokens,
          durationMs: 0,
          tenantId,
        },
        msg,
      ).catch(() => undefined);
    }

    return null;
  }
}
