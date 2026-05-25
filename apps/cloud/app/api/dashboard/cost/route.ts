import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getUserOrg } from '@/lib/org-context';
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';

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

    // Query all call records for cost analysis
    const records = await db.execute(sql`
      SELECT 
        timestamp,
        cost_usd,
        server_name
      FROM proxy_call_records
      WHERE org_id = ${ctx.org.id}
        AND timestamp >= to_timestamp(${startMs}::double precision / 1000)
        AND timestamp <= to_timestamp(${endMs}::double precision / 1000)
    `);

    const rows = records as any[];

    let totalCostUsd = 0;
    const serverCostMap = new Map<string, { cost: number; calls: number }>();

    for (const row of rows) {
      const cost = Number(row.cost_usd) || 0;
      totalCostUsd += cost;

      if (row.server_name) {
        const cur = serverCostMap.get(row.server_name) || { cost: 0, calls: 0 };
        cur.cost += cost;
        cur.calls++;
        serverCostMap.set(row.server_name, cur);
      }
    }

    const topServersByCost = Array.from(serverCostMap.entries())
      .map(([server, { cost, calls }]) => ({ server, costUsd: cost, calls }))
      .sort((a, b) => b.costUsd - a.costUsd)
      .slice(0, 10);

    const burnRatePerHour = window > 0 ? totalCostUsd / (window * 24) : 0;
    const projectedMonthlyUsd = burnRatePerHour * 24 * 30;

    return NextResponse.json({
      available: true,
      totalCostUsd: Math.round(totalCostUsd * 10000) / 10000,
      burnRatePerHour: Math.round(burnRatePerHour * 10000) / 10000,
      projectedMonthlyUsd: Math.round(projectedMonthlyUsd * 10000) / 10000,
      budgetUsd: null,
      budgetUtilizationPct: null,
      runwayDays: null,
      topServersByCost,
      windowDays: window,
      lastUpdate: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[dashboard-cost-api]', error);
    return NextResponse.json(
      { error: 'Failed to fetch cost data', available: false },
      { status: 500 }
    );
  }
}
