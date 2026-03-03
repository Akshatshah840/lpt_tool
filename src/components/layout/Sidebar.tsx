import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, FolderOpen, Users, BarChart2,
  FileAudio, ClipboardList, CheckSquare, LogOut, Mic,
} from 'lucide-react';
import type { UserRole } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface NavItem { to: string; label: string; icon: React.ReactNode }

const APP_ADMIN_NAV: NavItem[] = [
  { to: '/admin/dashboard', label: 'Dashboard',   icon: <LayoutDashboard size={17} /> },
  { to: '/admin/projects',  label: 'Projects',    icon: <FolderOpen size={17} /> },
  { to: '/admin/users',     label: 'Users',       icon: <Users size={17} /> },
  { to: '/admin/results',   label: 'All Results', icon: <BarChart2 size={17} /> },
];

const PROJECT_ADMIN_NAV: NavItem[] = [
  { to: '/project/dashboard',    label: 'Dashboard',    icon: <LayoutDashboard size={17} /> },
  { to: '/project/projects',     label: 'Projects',     icon: <FolderOpen size={17} /> },
  { to: '/project/tests',        label: 'Tests',        icon: <ClipboardList size={17} /> },
  { to: '/project/audio-assets', label: 'Audio Assets', icon: <FileAudio size={17} /> },
  { to: '/project/users',        label: 'Users',        icon: <Users size={17} /> },
];

const TRANSCRIBER_NAV: NavItem[] = [
  { to: '/transcriber/dashboard', label: 'My Tests',   icon: <LayoutDashboard size={17} /> },
  { to: '/transcriber/results',   label: 'My Results', icon: <CheckSquare size={17} /> },
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
  onSignOut: () => void;
}

export function Sidebar({ role, onSignOut }: SidebarProps) {
  const navItems = NAV_MAP[role] ?? [];

  return (
    <aside className="w-64 min-h-full flex flex-col bg-base-100 border-r border-base-content/[0.07]">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-base-content/[0.07]">
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

      {/* Nav */}
      <ul className="menu p-3 gap-0.5 text-sm font-medium flex-1">
        {navItems.map(item => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl',
                  isActive && 'nav-item-active text-base-content'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className={cn('inline-flex items-center justify-center flex-shrink-0 transition-colors', isActive ? 'nav-item-active-icon' : 'text-base-content/35')}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>

      {/* Sign out */}
      <div className="px-3 pb-4 pt-2 border-t border-base-content/[0.07]">
        <button
          onClick={onSignOut}
          className="btn btn-ghost btn-sm text-base-content/40 hover:text-error hover:bg-error/10 w-full justify-start gap-3"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
