import { useState, useEffect } from 'react';
import { Palette, Check } from 'lucide-react';

const THEMES = [
  { id: 'lpt-indigo',  label: 'Indigo',   dot: '#6366f1' },
  { id: 'lpt-slate',   label: 'Slate',    dot: '#818cf8' },
  { id: 'lpt-rose',    label: 'Rose',     dot: '#f43f5e' },
  { id: 'lpt-emerald', label: 'Emerald',  dot: '#10b981' },
  { id: 'lpt-light',   label: 'Light',    dot: '#e2e8f0' },
] as const;

type ThemeId = typeof THEMES[number]['id'];

function getStoredTheme(): ThemeId {
  return (localStorage.getItem('lpt-theme') as ThemeId) ?? 'lpt-indigo';
}

export function ThemeSwitcher() {
  const [current, setCurrent] = useState<ThemeId>(getStoredTheme);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', current);
    localStorage.setItem('lpt-theme', current);
  }, [current]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = () => setOpen(false);
    document.addEventListener('click', handler, { capture: true, once: true });
    return () => document.removeEventListener('click', handler, { capture: true });
  }, [open]);

  const active = THEMES.find(t => t.id === current)!;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all
          bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20
          text-white/70 hover:text-white"
        title="Switch theme"
      >
        <span className="w-3 h-3 rounded-full border border-white/20 flex-shrink-0" style={{ background: active.dot }} />
        <Palette size={14} className="opacity-60" />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-44 rounded-2xl overflow-hidden shadow-2xl z-50
            border border-white/10 bg-[oklch(var(--b2)/0.97)] backdrop-blur-xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="px-3 pt-3 pb-1">
            <p className="text-xs font-semibold uppercase tracking-widest opacity-40">Theme</p>
          </div>
          {THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => { setCurrent(t.id); setOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-all
                hover:bg-white/8 text-left"
            >
              <span className="w-4 h-4 rounded-full border border-white/20 flex-shrink-0" style={{ background: t.dot }} />
              <span className="flex-1 font-medium opacity-80">{t.label}</span>
              {current === t.id && <Check size={13} className="text-indigo-400 flex-shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
