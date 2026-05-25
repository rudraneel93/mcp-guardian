import { auth } from '@/lib/auth';
import { getUserOrg } from '@/lib/org-context';
import { NextResponse } from 'next/server';

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

    // Return placeholder security posture data
    return NextResponse.json({
      available: true,
      overallScore: 85,
      activeThreats: 0,
      threatsByType: {
        'credential-exposure': 0,
        'data-exfiltration': 0,
        'unauthorized-access': 0,
      },
      lastScan: new Date().toISOString(),
      complianceStatus: {
        HIPAA: 'compliant',
        SOC2: 'compliant',
        PCI_DSS: 'monitored',
      },
    });
  } catch (error) {
    console.error('[dashboard-security-api]', error);
    return NextResponse.json(
      { error: 'Failed to fetch security data', available: false },
      { status: 500 }
    );
  }
}
