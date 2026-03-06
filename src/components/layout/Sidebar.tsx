import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, FolderOpen, Users,
  CheckSquare, LogOut, Mic, ChevronUp,
} from 'lucide-react';
import type { UserRole } from '@/hooks/useAuth';
import { cn, getInitials } from '@/lib/utils';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  section?: string;
}

const APP_ADMIN_NAV: NavItem[] = [
  { to: '/admin/dashboard',    label: 'Dashboard',    icon: <LayoutDashboard size={18} />, section: 'Overview' },
  { to: '/admin/projects',     label: 'Projects',     icon: <FolderOpen size={18} />,      section: 'Manage' },
  { to: '/admin/users',        label: 'Users',        icon: <Users size={18} />,           section: 'Manage' },
  { to: '/admin/transcribers', label: 'Transcribers', icon: <Mic size={18} />,             section: 'Manage' },
];

const PROJECT_ADMIN_NAV: NavItem[] = [
  { to: '/project/dashboard',    label: 'Dashboard',    icon: <LayoutDashboard size={18} />, section: 'Overview' },
  { to: '/project/projects',     label: 'Projects',     icon: <FolderOpen size={18} />,      section: 'Manage' },
  { to: '/project/users',        label: 'Users',        icon: <Users size={18} />,           section: 'Manage' },
];

const TRANSCRIBER_NAV: NavItem[] = [
  { to: '/transcriber/dashboard', label: 'My Tests',   icon: <LayoutDashboard size={18} /> },
  { to: '/transcriber/results',   label: 'My Results', icon: <CheckSquare size={18} /> },
];

const NAV_MAP: Record<NonNullable<UserRole>, NavItem[]> = {
  APP_ADMINS:     APP_ADMIN_NAV,
  PROJECT_ADMINS: PROJECT_ADMIN_NAV,
  TRANSCRIBERS:   TRANSCRIBER_NAV,
};

const ROLE_LABEL: Record<NonNullable<UserRole>, string> = {
  APP_ADMINS:     'App Admin',
  PROJECT_ADMINS: 'Project Admin',
  TRANSCRIBERS:   'Transcriber',
};

const ROLE_COLOR: Record<NonNullable<UserRole>, string> = {
  APP_ADMINS:     'from-indigo-500 to-violet-600',
  PROJECT_ADMINS: 'from-purple-500 to-pink-600',
  TRANSCRIBERS:   'from-emerald-500 to-teal-600',
};

interface SidebarProps {
  role: NonNullable<UserRole>;
  userName: string | null;
  userEmail: string | null;
  onSignOut: () => void;
}

export function Sidebar({ role, userName, userEmail, onSignOut }: SidebarProps) {
  const [showMenu, setShowMenu] = useState(false);
  const navItems = NAV_MAP[role] ?? [];
  const initials = getInitials(userName ?? userEmail ?? '?');
  const displayName = userName ?? userEmail ?? 'User';

  // Group items by section
  const grouped: { section?: string; items: NavItem[] }[] = [];
  for (const item of navItems) {
    const last = grouped[grouped.length - 1];
    if (!last || last.section !== item.section) {
      grouped.push({ section: item.section, items: [item] });
    } else {
      last.items.push(item);
    }
  }

  return (
    <aside className="w-60 min-h-full flex flex-col bg-base-100 border-r border-base-content/[0.07]">

      {/* ── Logo — h-14 matches navbar height ─────────────────────── */}
      <div className="h-14 px-5 border-b border-base-content/[0.07] flex items-center flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className={cn('w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-lg', ROLE_COLOR[role])}>
            <Mic size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-base-content text-sm leading-none">LPT Tool</p>
            <p className="text-xs text-base-content/40 mt-0.5">{ROLE_LABEL[role]}</p>
          </div>
        </div>
      </div>

      {/* ── Nav ───────────────────────────────────────────────────── */}
      <div className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {grouped.map((group, gi) => (
          <div key={gi}>
            {group.section && (
              <p className="text-[10px] font-semibold text-base-content/30 uppercase tracking-widest px-3 pt-3 pb-1">
                {group.section}
              </p>
            )}
            {group.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium relative transition-colors',
                    isActive
                      ? 'nav-item-active text-base-content'
                      : 'text-base-content/60 hover:text-base-content hover:bg-base-content/[0.05]'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span
                        className="absolute left-0 inset-y-1.5 w-0.5 rounded-r-full"
                        style={{ background: 'oklch(var(--p))' }}
                      />
                    )}
                    <span className={cn(
                      'inline-flex items-center justify-center flex-shrink-0 transition-colors',
                      isActive ? 'nav-item-active-icon' : 'text-base-content/35'
                    )}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      {/* ── Profile button at bottom ───────────────────────────────── */}
      <div className="px-3 pb-3 pt-2 border-t border-base-content/[0.07] relative">
        {/* Popup — appears above, anchored to this container */}
        {showMenu && (
          <>
            {/* Click-away backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute bottom-full left-0 right-0 mb-2 px-3 z-50">
              <div className="card p-1.5 shadow-2xl border border-base-content/[0.08]">
                <button
                  onClick={() => { setShowMenu(false); onSignOut(); }}
                  className="btn btn-ghost btn-sm w-full justify-start gap-2.5 text-error/80 hover:text-error hover:bg-error/10"
                >
                  <LogOut size={15} />
                  Sign Out
                </button>
              </div>
            </div>
          </>
        )}

        {/* Profile row */}
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-base-content/[0.04] transition-colors">
          {/* Avatar */}
          <div className="avatar placeholder flex-shrink-0">
            <div
              className="w-8 rounded-full text-primary-content text-xs font-bold ring-2 ring-base-content/10"
              style={{ background: 'linear-gradient(135deg, oklch(var(--p)), oklch(var(--s)))' }}
            >
              <span>{initials}</span>
            </div>
          </div>

          {/* Name */}
          <span className="flex-1 min-w-0 text-sm font-medium text-base-content/70 truncate">
            {displayName}
          </span>

          {/* Arrow toggle */}
          <button
            onClick={() => setShowMenu(v => !v)}
            className="btn btn-ghost btn-xs btn-square text-base-content/40 hover:text-base-content flex-shrink-0"
            title="Account options"
          >
            <ChevronUp
              size={14}
              className={cn('transition-transform duration-200', showMenu ? '' : 'rotate-180')}
            />
          </button>
        </div>
      </div>
    </aside>
  );
}
