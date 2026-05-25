import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getUserOrg } from '@/lib/org-context';
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';

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

    const db = getDb();

    // Query all records to calculate health metrics
    const records = await db.execute(sql`
      SELECT 
        latency_ms,
        error_code
      FROM proxy_call_records
      WHERE org_id = ${ctx.org.id}
      LIMIT 10000
    `);

    const rows = records as any[];

    let totalLatency = 0;
    let totalRequests = rows.length;
    let errorCount = 0;

    for (const row of rows) {
      totalLatency += Number(row.latency_ms) || 0;
      if (row.error_code) errorCount++;
    }

    const avgLatency = totalRequests > 0 ? Math.round(totalLatency / totalRequests) : 0;
    const uptime = totalRequests > 0 ? ((totalRequests - errorCount) / totalRequests) * 100 : 100;
    const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;

    return NextResponse.json({
      available: true,
      avgLatencyMs: avgLatency,
      uptime: Math.round(uptime * 100) / 100,
      totalRequests,
      errorRate: Math.round(errorRate * 100) / 100,
      errors: errorCount,
      servers: 1,
      successfulRequests: totalRequests - errorCount,
      lastUpdate: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[dashboard-health-api]', error);
    return NextResponse.json(
      { error: 'Failed to fetch health data', available: false },
      { status: 500 }
    );
  }
}
