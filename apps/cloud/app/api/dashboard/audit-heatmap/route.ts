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

    // Query blocked records
    const records = await db.execute(sql`
      SELECT 
        timestamp,
        block_rule,
        tool_name
      FROM proxy_call_records
      WHERE org_id = ${ctx.org.id}
        AND blocked = true
        AND timestamp >= to_timestamp(${startMs}::double precision / 1000)
        AND timestamp <= to_timestamp(${endMs}::double precision / 1000)
    `);

    const rows = records as any[];

    // Build heatmap cells (rule × tool)
    const cellMap = new Map<string, number>();
    for (const row of rows) {
      const rule = row.block_rule || 'unknown';
      const tool = row.tool_name || 'unknown';
      const key = `${rule}\0${tool}`;
      cellMap.set(key, (cellMap.get(key) || 0) + 1);
    }

    const cells = Array.from(cellMap.entries())
      .map(([key, count]) => {
        const [rule, tool] = key.split('\0');
        return { rule, tool, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 100);

    // Build activity matrix (day × hour)
    const dayHourMap = new Map<string, number>();
    let maxCount = 0;

    for (const row of rows) {
      const ts = new Date(row.timestamp).getTime();
      const d = new Date(ts);
      const day = d.toISOString().slice(0, 10);
      const hour = d.getUTCHours();
      const key = `${day}\0${hour}`;
      const count = (dayHourMap.get(key) || 0) + 1;
      dayHourMap.set(key, count);
      if (count > maxCount) maxCount = count;
    }

    const days = [...new Set([...dayHourMap.keys()].map((k) => k.split('\0')[0]))].sort();
    const hours = Array.from({ length: 24 }, (_, i) => i);

    const matrix = days.map((day) =>
      hours.map((hour) => dayHourMap.get(`${day}\0${hour}`) || 0)
    );

    return NextResponse.json({
      available: cells.length > 0 || matrix.length > 0,
      windowDays: window,
      cells,
      activity: {
        days,
        hours,
        matrix,
        maxCount,
      },
    });
  } catch (error) {
    console.error('[dashboard-audit-heatmap-api]', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit heatmap', available: false, cells: [], activity: { days: [], hours: [], matrix: [], maxCount: 0 } },
      { status: 500 }
    );
  }
}
