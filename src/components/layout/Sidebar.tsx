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
  { to: '/project/transcribers', label: 'Users',        icon: <Users size={17} /> },
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
    <aside className="glass-sidebar w-64 min-h-full flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/[0.07]">
        <div className="flex items-center gap-3">
          <div className={cn('w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg', ROLE_COLOR[role])}>
            <Mic size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-none">LPT Tool</p>
            <p className="text-xs text-white/40 mt-0.5">{ROLE_LABEL[role]}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-0.5">
          {navItems.map(item => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'nav-item-active text-white shadow-sm'
                      : 'text-white/50 hover:text-white/85 hover:bg-white/[0.06]'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={cn('transition-colors', isActive ? 'nav-item-active-icon' : 'text-white/35')}>
                      {item.icon}
                    </span>
                    {item.label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Sign out */}
      <div className="px-3 pb-4 pt-2 border-t border-white/[0.07]">
        <button
          onClick={onSignOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
