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
    const scope = (searchParams.get('scope') as string) || 'overview';
    const windowStr = searchParams.get('window') || '7';
    const window = parseWindow(windowStr);
    const { startMs, endMs } = windowRangeMs(window);

    const db = getDb();

    // Query call records
    const records = await db.execute(sql`
      SELECT 
        timestamp,
        blocked,
        tool_name,
        block_rule,
        cost_usd
      FROM proxy_call_records
      WHERE org_id = ${ctx.org.id}
        AND timestamp >= to_timestamp(${startMs}::double precision / 1000)
        AND timestamp <= to_timestamp(${endMs}::double precision / 1000)
    `);

    const rows = records as any[];

    // Build measured insights
    let bullets: string[] = [];

    if (scope === 'overview' || scope === 'all') {
      const totalRequests = rows.length;
      const blockedRequests = rows.filter((r) => r.blocked).length;
      const passRate = totalRequests > 0 ? ((totalRequests - blockedRequests) / totalRequests) * 100 : 100;

      bullets.push(
        `${totalRequests.toLocaleString()} measured proxy calls; pass rate ${passRate.toFixed(1)}%.`
      );

      const toolSet = new Set(rows.map((r) => r.tool_name).filter(Boolean));
      if (toolSet.size > 0) {
        bullets.push(`Activity across ${toolSet.size} unique tools.`);
      }
    }

    if (scope === 'cost' || scope === 'all') {
      const totalCost = rows.reduce((sum, r) => sum + (Number(r.cost_usd) || 0), 0);
      if (totalCost > 0) {
        bullets.push(`Measured spend: $${totalCost.toFixed(4)} from ${rows.length} calls.`);
      }
    }

    if (scope === 'audit' || scope === 'all') {
      const blockedRequests = rows.filter((r) => r.blocked).length;
      const totalRequests = rows.length;
      if (totalRequests > 0) {
        const blockPct = Math.round((blockedRequests / totalRequests) * 100);
        bullets.push(
          `${totalRequests.toLocaleString()} audit events; ${blockedRequests.toLocaleString()} blocks (${blockPct}%).`
        );
      }
    }

    return NextResponse.json({
      scope,
      generatedAt: new Date().toISOString(),
      windowDays: window,
      source: 'measured',
      bullets: bullets.slice(0, 5),
    });
  } catch (error) {
    console.error('[dashboard-insights-api]', error);
    return NextResponse.json(
      { error: 'Failed to fetch insights', available: false, bullets: [] },
      { status: 500 }
    );
  }
}
