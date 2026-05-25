import { auth } from '@/lib/auth';
import { getUserOrg } from '@/lib/org-context';
import DashboardClient from '@/components/DashboardClient';

export default async function DashboardPage() {
  const session = await auth();
  const ctx = await getUserOrg(session!.user!.id);
  if (!ctx) return null;

  return <DashboardClient />;
}
