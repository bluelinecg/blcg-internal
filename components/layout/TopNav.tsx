'use client';

// Top navigation bar for the dashboard shell.
// Derives the current page title from the pathname and renders the Clerk UserButton.
// Props: none — title is derived from the current route.

import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/clients': 'Clients',
  '/proposals': 'Proposals',
  '/emails': 'Emails',
  '/settings': 'Settings',
};

function resolvePageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];

  const match = Object.keys(PAGE_TITLES).find(
    (key) => key !== '/dashboard' && pathname.startsWith(key + '/')
  );

  return match ? PAGE_TITLES[match] : 'BLCG Internal';
}

export function TopNav() {
  const pathname = usePathname();
  const title = resolvePageTitle(pathname);

  return (
    <header className="flex items-center justify-between px-6 h-16 bg-white border-b border-gray-200">
      <h1 className="text-lg font-semibold text-brand-navy">{title}</h1>
      <UserButton />
    </header>
  );
}
