import { useState } from 'react';
import { UserCircle, Globe, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LANGUAGES } from '@/lib/languages';

interface ProfileSetupProps {
  userName: string | null;
  onComplete: (lang: string) => void;
}

export function ProfileSetup({ userName, onComplete }: ProfileSetupProps) {
  const parts = (userName ?? '').split(' ');
  const [firstName, setFirstName] = useState(parts[0] ?? '');
  const [lastName, setLastName] = useState(parts.slice(1).join(' ') ?? '');
  const [language, setLanguage] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!language) return;
    onComplete(language);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl" style={{ background: 'oklch(var(--p) / 0.08)' }} />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl" style={{ background: 'oklch(var(--s) / 0.08)' }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-xl mb-5" style={{ background: 'linear-gradient(135deg, oklch(var(--p) / 0.2), oklch(var(--s) / 0.2))', border: '1px solid oklch(var(--p) / 0.25)' }}>
            <UserCircle size={30} style={{ color: 'oklch(var(--p))' }} />
          </div>
          <h1 className="text-2xl font-bold text-base-content">Complete Your Profile</h1>
          <p className="text-base-content/40 text-sm mt-2">
            Set up your preferences to get started
          </p>
        </div>

        <div className="card p-7 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name fields */}
            <div>
              <label className="block text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-3">
                Your Name
              </label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  required
                  placeholder="First name"
                  className="input input-bordered w-full"
                />
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="Last name"
                  className="input input-bordered w-full"
                />
              </div>
            </div>

            {/* Language selection */}
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-3">
                <Globe size={13} /> Preferred Language
              </label>
              <div className="grid grid-cols-3 gap-2">
                {LANGUAGES.map(l => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => setLanguage(l.code)}
                    className={cn(
                      'btn gap-1.5 flex-col h-auto py-3',
                      language === l.code ? 'btn-primary' : 'btn-outline btn-ghost'
                    )}
                  >
                    <span className="text-xl leading-none">{l.flag}</span>
                    <span className="text-xs leading-none">{l.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={!language || !firstName}
              className="btn btn-primary w-full gap-2 disabled:opacity-40"
            >
              Get Started <ArrowRight size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
