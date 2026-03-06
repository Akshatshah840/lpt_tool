import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import type { UserRole } from '@/hooks/useAuth';

interface AppLayoutProps {
  role: NonNullable<UserRole>;
  userName: string | null;
  userEmail: string | null;
  children: React.ReactNode;
  onSignOut?: () => void;
}

export function AppLayout({ role, userName, userEmail, children, onSignOut }: AppLayoutProps) {
  return (
    /* DaisyUI drawer — lg:drawer-open keeps sidebar always visible on desktop */
    <div className="drawer lg:drawer-open min-h-screen">
      <input id="sidebar-drawer" type="checkbox" className="drawer-toggle" />

      {/* Main content area */}
      <div className="drawer-content flex flex-col min-h-screen">
        <Navbar userName={userName} userEmail={userEmail} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 max-w-screen-2xl w-full mx-auto page-enter">
          {children}
        </main>
      </div>

      {/* Sidebar drawer */}
      <div className="drawer-side z-40">
        {/* Overlay (mobile only) */}
        <label htmlFor="sidebar-drawer" aria-label="close sidebar" className="drawer-overlay" />
        <Sidebar role={role} userName={userName} userEmail={userEmail} onSignOut={onSignOut ?? (() => {})} />
      </div>
    </div>
  );
}
