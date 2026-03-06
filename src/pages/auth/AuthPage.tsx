import { Authenticator } from '@aws-amplify/ui-react';
import { Mic } from 'lucide-react';

const formFields = {
  signUp: {
    given_name: {
      label: 'First Name',
      placeholder: 'Enter your first name',
      order: 1,
    },
    family_name: {
      label: 'Last Name',
      placeholder: 'Enter your last name',
      order: 2,
    },
    email: {
      label: 'Email',
      placeholder: 'Enter your email',
      order: 3,
    },
    password: {
      label: 'Password',
      placeholder: 'Create a password',
      order: 4,
    },
    confirm_password: {
      label: 'Confirm Password',
      placeholder: 'Confirm your password',
      order: 5,
    },
  },
};

const FEATURES = [
  'Secure AWS-backed authentication',
  'Multi-language test support',
  'Role-based access & analytics',
];

export function AuthPage() {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      {/* ── Left branding panel (lg+ only) ──────────────────────────── */}
      <div
        className="relative hidden lg:flex flex-col items-center justify-center overflow-hidden"
        style={{ background: 'linear-gradient(135deg, oklch(var(--p) / 0.88) 0%, oklch(var(--s) / 0.82) 100%)' }}
      >
        {/* Decorative blobs */}
        <div
          className="absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full opacity-20 blur-3xl"
          style={{ background: 'oklch(var(--pc))' }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full opacity-20 blur-3xl"
          style={{ background: 'oklch(var(--s) / 0.6)' }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-10 blur-2xl"
          style={{ background: 'oklch(var(--pc))' }}
        />

        {/* Content */}
        <div className="relative z-10 text-center px-14 max-w-sm">
          <div
            className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-6 shadow-2xl"
            style={{
              background: 'oklch(var(--pc) / 0.18)',
              border: '1.5px solid oklch(var(--pc) / 0.35)',
            }}
          >
            <Mic size={36} className="text-primary-content" />
          </div>
          <h1 className="text-4xl font-bold text-primary-content mb-3 tracking-tight">LPT Tool</h1>
          <p className="text-primary-content/70 text-base mb-10 leading-relaxed">
            Language Proficiency Testing Platform
          </p>
          <div className="space-y-4 text-left">
            {FEATURES.map((feat, i) => (
              <div key={i} className="flex items-center gap-3">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'oklch(var(--pc) / 0.22)', border: '1px solid oklch(var(--pc) / 0.3)' }}
                >
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="text-primary-content/80 text-sm">{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel ─────────────────────────────────────────── */}
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile-only header */}
          <div className="text-center mb-6 lg:hidden">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 bg-gradient-to-br from-primary to-secondary shadow-xl shadow-primary/30">
              <Mic size={28} className="text-primary-content" />
            </div>
            <h1 className="text-2xl font-bold text-base-content">LPT Tool</h1>
            <p className="text-base-content/50 text-sm mt-1">Language Proficiency Testing Platform</p>
          </div>

          <div className="card overflow-hidden">
            <Authenticator formFields={formFields} hideSignUp={false} />
          </div>
          <p className="text-center text-base-content/40 text-xs mt-4">
            New users are automatically registered as Transcribers.
          </p>
        </div>
      </div>
    </div>
  );
}
