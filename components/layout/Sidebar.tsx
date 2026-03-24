'use client';

// Sidebar navigation for the dashboard shell.
// Uses brand-navy background with brand-blue active state indicator.
// Highlights the active route via usePathname.
// Finances nav item is hidden for non-admin users.
// Props: none — nav items are defined as a module-level constant.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandLogo } from './BrandLogo';
import { useRole } from '@/lib/auth/use-role';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

// --- Icons ---

function IconDashboard() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

function IconClients() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconProposals() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function IconPipelines() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="3" width="4" height="18" rx="1" />
      <rect x="10" y="3" width="4" height="18" rx="1" />
      <rect x="18" y="3" width="4" height="18" rx="1" />
    </svg>
  );
}

function IconProjects() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconTasks() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="5" height="18" rx="1" />
      <rect x="10" y="3" width="5" height="12" rx="1" />
      <rect x="17" y="3" width="5" height="16" rx="1" />
    </svg>
  );
}

function IconFinances() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function IconEmails() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
}

function IconContacts() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconOrganizations() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

// --- Nav items ---

// Main nav — Dashboard first, then alphabetical. Settings is pinned to the bottom separately.
const MAIN_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <IconDashboard /> },
  { label: 'Clients',       href: '/clients',       icon: <IconClients /> },
  { label: 'Contacts',      href: '/contacts',      icon: <IconContacts /> },
  { label: 'Emails',        href: '/emails',        icon: <IconEmails /> },
  { label: 'Finances',      href: '/finances',      icon: <IconFinances /> },
  { label: 'Organizations', href: '/organizations', icon: <IconOrganizations /> },
  { label: 'Pipelines',     href: '/pipelines',     icon: <IconPipelines /> },
  { label: 'Projects',      href: '/projects',      icon: <IconProjects /> },
  { label: 'Proposals',     href: '/proposals',     icon: <IconProposals /> },
  { label: 'Tasks',         href: '/tasks',         icon: <IconTasks /> },
  { label: 'Users',         href: '/users',         icon: <IconUsers /> },
];

const SETTINGS_ITEM: NavItem = { label: 'Settings', href: '/settings', icon: <IconSettings /> };

// --- Nav link ---

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        isActive
          ? 'bg-brand-blue text-white'
          : 'text-brand-steel hover:bg-white/10 hover:text-white'
      }`}
    >
      {item.icon}
      {item.label}
    </Link>
  );
}

// --- Component ---

export function Sidebar() {
  const pathname = usePathname();
  const role = useRole();
  const visibleNavItems = MAIN_NAV_ITEMS.filter(
    (item) => item.href !== '/finances' || role === 'admin'
  );

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-brand-navy">
      {/* Logo */}
      <div className="flex items-center justify-center px-6 h-16 border-b border-white/10">
        <BrandLogo variant="light" width={148} />
      </div>

      {/* Navigation */}
      <nav className="flex flex-col flex-1 px-3 py-5">
        {/* Main nav items */}
        <div className="flex flex-col gap-0.5 flex-1">
          {visibleNavItems.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </div>

        {/* Settings pinned to bottom */}
        <div className="pt-2 border-t border-white/10">
          <NavLink item={SETTINGS_ITEM} pathname={pathname} />
        </div>
      </nav>
    </aside>
  );
}
