import { Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { getInitials } from '@/lib/utils';
import { ThemeSwitcher } from '@/components/shared/ThemeSwitcher';

const ROUTE_TITLES: Record<string, string> = {
  '/admin/dashboard':      'Dashboard',
  '/admin/projects':       'Projects',
  '/admin/users':          'Users',
  '/admin/results':        'All Results',
  '/project/dashboard':    'Dashboard',
  '/project/projects':     'Projects',
  '/project/users':        'Users',
  '/project/tests':        'Tests',
  '/project/transcribers': 'Transcribers',
  '/project/audio-assets': 'Audio Assets',
  '/transcriber/dashboard': 'My Tests',
  '/transcriber/results':   'My Results',
};

function getPageTitle(pathname: string): string {
  // Exact match first
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];
  // Prefix match for nested routes (e.g. /project/projects/abc)
  for (const [route, title] of Object.entries(ROUTE_TITLES)) {
    if (pathname.startsWith(route + '/')) return title;
  }
  return '';
}

interface NavbarProps {
  userName: string | null;
  userEmail: string | null;
}

export function Navbar({ userName, userEmail }: NavbarProps) {
  const location = useLocation();
  const initials = getInitials(userName ?? userEmail ?? '?');
  const displayName = userName ?? userEmail ?? 'User';
  const pageTitle = getPageTitle(location.pathname);

  return (
    <div className="navbar bg-base-200/60 sticky top-0 z-30 min-h-14 px-4 lg:px-6 border-b border-base-content/[0.07]">
      <div className="navbar-start gap-3">
        {/* Mobile hamburger — targets DaisyUI drawer checkbox */}
        <label
          htmlFor="sidebar-drawer"
          className="btn btn-ghost btn-sm btn-square lg:hidden"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </label>

        {/* Page title — desktop only */}
        {pageTitle && (
          <span className="text-sm font-semibold text-base-content/70 hidden lg:block">
            {pageTitle}
          </span>
        )}
      </div>

      <div className="navbar-end gap-3">
        <ThemeSwitcher />

        {/* User chip — mobile only (desktop: shown in sidebar profile) */}
        <div className="flex items-center gap-2 pl-3 border-l border-base-content/[0.08] lg:hidden">
          <div className="avatar placeholder">
            <div
              className="w-8 rounded-full text-primary-content text-xs font-bold ring-2 ring-base-content/10"
              style={{ background: 'linear-gradient(135deg, oklch(var(--p)), oklch(var(--s)))' }}
            >
              <span>{initials}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
