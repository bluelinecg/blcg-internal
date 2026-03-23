// Finances layout — server component.
// Guards the entire /finances route tree so only admins can access it.
// Members are redirected to the dashboard before the page renders.

import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth/roles';

interface FinancesLayoutProps {
  children: React.ReactNode;
}

export default async function FinancesLayout({ children }: FinancesLayoutProps) {
  if (!(await isAdmin())) {
    redirect('/dashboard');
  }

  return <>{children}</>;
}
