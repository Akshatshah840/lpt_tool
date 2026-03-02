import { useState } from 'react';
import { UserCircle, Globe, ArrowRight } from 'lucide-react';

const LANGUAGES = [
  { code: 'hi',    label: 'Hindi',   flag: '🇮🇳' },
  { code: 'en',    label: 'English', flag: '🇬🇧' },
  { code: 'es',    label: 'Spanish', flag: '🇪🇸' },
  { code: 'fr',    label: 'French',  flag: '🇫🇷' },
  { code: 'de',    label: 'German',  flag: '🇩🇪' },
  { code: 'other', label: 'Other',   flag: '🌐' },
];

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
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-indigo-600/8 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-violet-600/8 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-600/20 border border-indigo-500/25 shadow-xl mb-5">
            <UserCircle size={30} className="text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Complete Your Profile</h1>
          <p className="text-white/40 text-sm mt-2">
            Set up your preferences to get started
          </p>
        </div>

        <div className="glass-card p-7 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name fields */}
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
                Your Name
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input
                    type="text"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    required
                    placeholder="First name"
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white text-sm
                      placeholder-white/25 outline-none transition-all
                      focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="Last name"
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white text-sm
                      placeholder-white/25 outline-none transition-all
                      focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
            </div>

            {/* Language selection */}
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
                <Globe size={13} /> Preferred Language
              </label>
              <div className="grid grid-cols-3 gap-2">
                {LANGUAGES.map(l => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => setLanguage(l.code)}
                    className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border text-sm font-medium
                      transition-all duration-150 ${
                        language === l.code
                          ? 'bg-indigo-500/20 border-indigo-500/50 text-white shadow-lg shadow-indigo-500/10'
                          : 'bg-white/[0.04] border-white/10 text-white/50 hover:bg-white/[0.08] hover:text-white/80'
                      }`}
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
              className="w-full py-3 btn-gradient rounded-xl text-sm font-semibold
                flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Get Started <ArrowRight size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
