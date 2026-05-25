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

    // Get fleet instances
    const instanceRows = await db.execute(sql`
      SELECT 
        instance_id,
        instance_name,
        hostname,
        region,
        status,
        last_heartbeat,
        metrics_snapshot
      FROM guardian_fleet_instances
      WHERE org_id = ${ctx.org.id}
      ORDER BY last_heartbeat DESC
    `);

    const instances = (instanceRows as any[]).map((row) => ({
      instanceId: row.instance_id,
      instanceName: row.instance_name || row.instance_id,
      hostname: row.hostname || 'unknown',
      status: row.status || 'inactive',
      region: row.region,
      lastHeartbeat: new Date(row.last_heartbeat).toISOString(),
      totalRequests: row.metrics_snapshot?.totalRequests || 0,
      blockedRequests: row.metrics_snapshot?.blockedRequests || 0,
      totalCostUsd: row.metrics_snapshot?.costUsd || 0,
      fleetSource: 'cloud',
    }));

    const totalRequests = instances.reduce((sum, i) => sum + (i.totalRequests || 0), 0);
    const totalBlocked = instances.reduce((sum, i) => sum + (i.blockedRequests || 0), 0);
    const totalCostUsd = instances.reduce((sum, i) => sum + (i.totalCostUsd || 0), 0);
    const activeInstances = instances.filter((i) => i.status === 'active').length;

    return NextResponse.json({
      available: instances.length > 0,
      source: 'cloud-fleet',
      region: 'multi',
      totalInstances: instances.length,
      activeInstances,
      totalRequests,
      totalBlocked,
      totalCostUsd,
      instances,
    });
  } catch (error) {
    console.error('[dashboard-fleet-api]', error);
    return NextResponse.json(
      { error: 'Failed to fetch fleet data', available: false, instances: [] },
      { status: 500 }
    );
  }
}
