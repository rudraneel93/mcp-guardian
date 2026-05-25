import { redirect } from 'next/navigation';

/** Canonical dashboard UI lives at `/`; keep `/dashboard` reachable for bookmarks. */
export default function DashboardAliasPage() {
  redirect('/');
}
