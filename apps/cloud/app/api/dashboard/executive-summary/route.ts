import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getUserOrg } from '@/lib/org-context';
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';

// Parse window parameter
function parseWindow(windowStr: string): number {
  const w = parseInt(windowStr, 10);
  if (isNaN(w) || w < 1) return 7;
  if (w > 365) return 365;
  return w;
}

function windowRangeMs(days: number) {
  const now = Date.now();
  const startMs = now - days * 24 * 60 * 60 * 1000;
  return { startMs, endMs: now };
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ctx = await getUserOrg(session.user.id);
    if (!ctx) {
      return NextResponse.json({ error: 'No organization' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const windowStr = searchParams.get('window') || '7';
    const window = parseWindow(windowStr);
    const { startMs, endMs } = windowRangeMs(window);

    const db = getDb();

    // Query all call records for the org in the time window
    const records = await db.execute(sql`
      SELECT 
        timestamp,
        server_name,
        tool_name,
        block_rule,
        blocked,
        latency_ms,
        cost_usd
      FROM proxy_call_records
      WHERE org_id = ${ctx.org.id}
        AND timestamp >= to_timestamp(${startMs}::double precision / 1000)
        AND timestamp <= to_timestamp(${endMs}::double precision / 1000)
    `);

    const rows = records as any[];

    // Aggregate metrics
    let totalRequests = 0;
    let blockedRequests = 0;
    let totalCostUsd = 0;
    let totalLatency = 0;
    const serverSet = new Set<string>();
    const toolMap = new Map<string, number>();
    const serverCostMap = new Map<string, { cost: number; calls: number }>();

    for (const row of rows) {
      totalRequests++;
      if (row.blocked) blockedRequests++;
      totalCostUsd += Number(row.cost_usd) || 0;
      totalLatency += Number(row.latency_ms) || 0;
      if (row.server_name) serverSet.add(row.server_name);

      // Track top tools
      if (row.tool_name) {
        toolMap.set(row.tool_name, (toolMap.get(row.tool_name) || 0) + 1);
      }

      // Track server costs
      if (row.server_name) {
        const cur = serverCostMap.get(row.server_name) || { cost: 0, calls: 0 };
        cur.cost += Number(row.cost_usd) || 0;
        cur.calls++;
        serverCostMap.set(row.server_name, cur);
      }
    }

    const passRatePct = totalRequests > 0 ? ((totalRequests - blockedRequests) / totalRequests) * 100 : 100;
    const blockRatePct = totalRequests > 0 ? (blockedRequests / totalRequests) * 100 : 0;
    const avgLatencyMs = totalRequests > 0 ? Math.round(totalLatency / totalRequests) : 0;

    const topToolsByCalls = Array.from(toolMap.entries())
      .map(([tool, calls]) => ({ tool, calls }))
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 10);

    const topServersByCost = Array.from(serverCostMap.entries())
      .map(([server, { cost, calls }]) => ({ server, costUsd: cost, calls }))
      .sort((a, b) => b.costUsd - a.costUsd)
      .slice(0, 10);

    return NextResponse.json({
      available: true,
      timestamp: new Date().toISOString(),
      windowDays: window,
      totalRequests,
      blockedRequests,
      passedRequests: totalRequests - blockedRequests,
      passRatePct: Math.round(passRatePct * 100) / 100,
      blockRatePct: Math.round(blockRatePct * 100) / 100,
      totalCostUsd: Math.round(totalCostUsd * 10000) / 10000,
      avgLatencyMs,
      activeServers: serverSet.size,
      topServersByCost,
      topToolsByCalls,
    });
  } catch (error) {
    console.error('[dashboard-executive-summary-api]', error);
    return NextResponse.json(
      { error: 'Failed to fetch executive summary', available: false },
      { status: 500 }
    );
  }
}

