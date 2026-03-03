import { Menu } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { ThemeSwitcher } from '@/components/shared/ThemeSwitcher';

interface NavbarProps {
  userName: string | null;
  userEmail: string | null;
}

export function Navbar({ userName, userEmail }: NavbarProps) {
  const initials = getInitials(userName ?? userEmail ?? '?');
  const displayName = userName ?? userEmail ?? 'User';

  return (
    <div className="navbar bg-base-200/60 sticky top-0 z-30 min-h-14 px-4 lg:px-6 border-b border-base-content/[0.07]">
      <div className="navbar-start">
        {/* Mobile hamburger — targets DaisyUI drawer checkbox */}
        <label
          htmlFor="sidebar-drawer"
          className="btn btn-ghost btn-sm btn-square lg:hidden"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </label>
      </div>

      <div className="navbar-end gap-3">
        <ThemeSwitcher />

        {/* Divider + user chip */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-base-content/[0.08]">
          <div
            className="avatar placeholder"
          >
            <div
              className="w-8 rounded-full text-primary-content text-xs font-bold ring-2 ring-base-content/10"
              style={{ background: 'linear-gradient(135deg, oklch(var(--p)), oklch(var(--s)))' }}
            >
              <span>{initials}</span>
            </div>
          </div>
          <span className="text-sm font-medium text-base-content/70 hidden sm:block max-w-[140px] truncate">
            {displayName}
          </span>
        </div>
      </div>
    </div>
  );
}
