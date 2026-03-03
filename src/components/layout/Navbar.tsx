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
    <header className="h-14 border-b border-white/[0.07] bg-[oklch(var(--b2)/0.6)] backdrop-blur-xl flex items-center justify-between px-4 lg:px-6 gap-4 sticky top-0 z-30">
      {/* Mobile hamburger — targets DaisyUI drawer checkbox */}
      <label
        htmlFor="sidebar-drawer"
        className="btn btn-ghost btn-sm btn-square lg:hidden text-white/60 hover:text-white border-0 rounded-xl cursor-pointer"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </label>

      {/* Spacer on desktop */}
      <div className="flex-1 hidden lg:block" />

      {/* Right-side controls */}
      <div className="flex items-center gap-3 ml-auto">
        <ThemeSwitcher />

        {/* Divider + user chip */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-white/[0.08]">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md ring-2 ring-white/10 flex-shrink-0" style={{ background: 'linear-gradient(135deg, oklch(var(--p)), oklch(var(--s)))' }}>
            {initials}
          </div>
          <span className="text-sm font-medium text-white/70 hidden sm:block max-w-[140px] truncate">
            {displayName}
          </span>
        </div>
      </div>
    </header>
  );
}
