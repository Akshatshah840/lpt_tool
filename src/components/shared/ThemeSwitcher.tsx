import { useState, useEffect } from 'react';
import { Palette, Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThemeConfig {
  id: string;
  label: string;
  colors: [string, string, string, string]; // primary, secondary, accent, neutral
}

const CUSTOM_THEMES: ThemeConfig[] = [
  { id: 'lpt-indigo',  label: 'Indigo',  colors: ['#6366f1', '#8b5cf6', '#22c55e', '#1e293b'] },
  { id: 'lpt-slate',   label: 'Slate',   colors: ['#818cf8', '#a78bfa', '#34d399', '#334155'] },
  { id: 'lpt-rose',    label: 'Rose',    colors: ['#f43f5e', '#e879f9', '#fb923c', '#2d1b20'] },
  { id: 'lpt-emerald', label: 'Emerald', colors: ['#10b981', '#14b8a6', '#6366f1', '#1a2e22'] },
  { id: 'lpt-light',   label: 'Light',   colors: ['#6366f1', '#8b5cf6', '#22c55e', '#e2e8f0'] },
];

const DAISY_THEMES: ThemeConfig[] = [
  { id: 'light',     label: 'Light',     colors: ['#570df8', '#f000b8', '#37cdbe', '#3d4451'] },
  { id: 'dark',      label: 'Dark',      colors: ['#793ef9', '#f000b8', '#37cdbe', '#2a323c'] },
  { id: 'cupcake',   label: 'Cupcake',   colors: ['#65c3c8', '#ef9fbc', '#eeaf3a', '#291334'] },
  { id: 'bumblebee', label: 'Bumblebee', colors: ['#e0a82e', '#f9d72f', '#181830', '#2a1503'] },
  { id: 'emerald',   label: 'Emerald',   colors: ['#66cc8a', '#377cfb', '#f68067', '#333c4a'] },
  { id: 'corporate', label: 'Corporate', colors: ['#4b6bfb', '#7b92b2', '#67cba0', '#1e2734'] },
  { id: 'synthwave', label: 'Synthwave', colors: ['#e779c1', '#58c7f3', '#f3cc30', '#221551'] },
  { id: 'retro',     label: 'Retro',     colors: ['#ef9900', '#dc2626', '#3b9f55', '#282425'] },
  { id: 'cyberpunk', label: 'Cyberpunk', colors: ['#ff7598', '#75d1f0', '#c07eec', '#ffee00'] },
  { id: 'valentine', label: 'Valentine', colors: ['#e96d7b', '#a991f7', '#88dbdd', '#af1654'] },
  { id: 'halloween', label: 'Halloween', colors: ['#f28c18', '#6d3a9c', '#51a800', '#212121'] },
  { id: 'garden',    label: 'Garden',    colors: ['#5c7f67', '#ecf4e7', '#f0d7bc', '#2a2a37'] },
  { id: 'forest',    label: 'Forest',    colors: ['#1eb854', '#1db990', '#1a1c1e', '#171212'] },
  { id: 'aqua',      label: 'Aqua',      colors: ['#09ecf3', '#966fb3', '#ffe999', '#3b1f2b'] },
  { id: 'lofi',      label: 'Lo-fi',     colors: ['#0d0d0d', '#1a1919', '#262626', '#ffffff'] },
  { id: 'pastel',    label: 'Pastel',    colors: ['#d1c1fb', '#f9a8d4', '#fde68a', '#403c5c'] },
  { id: 'fantasy',   label: 'Fantasy',   colors: ['#6e0b75', '#007ebd', '#f2b93b', '#0f0617'] },
  { id: 'wireframe', label: 'Wireframe', colors: ['#b8b8b8', '#b8b8b8', '#b8b8b8', '#ebebeb'] },
  { id: 'black',     label: 'Black',     colors: ['#343232', '#343232', '#767676', '#000000'] },
  { id: 'luxury',    label: 'Luxury',    colors: ['#ffffff', '#152747', '#513448', '#09090b'] },
  { id: 'dracula',   label: 'Dracula',   colors: ['#ff79c6', '#bd93f9', '#ffb86c', '#414558'] },
  { id: 'cmyk',      label: 'CMYK',      colors: ['#45aeee', '#e8488a', '#a0cc57', '#fffff4'] },
  { id: 'autumn',    label: 'Autumn',    colors: ['#8c0327', '#e97f14', '#7fcfd2', '#3d1a00'] },
  { id: 'business',  label: 'Business',  colors: ['#1c4e80', '#7c909a', '#ea6947', '#23282e'] },
  { id: 'acid',      label: 'Acid',      colors: ['#ff00f4', '#ff7400', '#ff0000', '#e8ff00'] },
  { id: 'lemonade',  label: 'Lemonade',  colors: ['#519903', '#e9e92f', '#f3f0d7', '#ffffff'] },
  { id: 'night',     label: 'Night',     colors: ['#38bdf8', '#818cf8', '#f471b5', '#1e3a5f'] },
  { id: 'coffee',    label: 'Coffee',    colors: ['#db924b', '#263e3f', '#10576d', '#1c1c1c'] },
  { id: 'winter',    label: 'Winter',    colors: ['#047aff', '#463aa2', '#c148ac', '#ebf4fb'] },
  { id: 'dim',       label: 'Dim',       colors: ['#9fe88d', '#ff9d66', '#f9f871', '#2a323c'] },
  { id: 'nord',      label: 'Nord',      colors: ['#5e81ac', '#81a1c1', '#88c0d0', '#4c566a'] },
  { id: 'sunset',    label: 'Sunset',    colors: ['#ff865b', '#fd6f9c', '#b387fa', '#383448'] },
];

function ThemeSwatch({ colors }: { colors: [string, string, string, string] }) {
  return (
    <div className="grid grid-cols-2 gap-px w-[18px] h-[18px] rounded overflow-hidden flex-shrink-0 border border-black/10">
      {colors.map((c, i) => (
        <span key={i} style={{ background: c }} />
      ))}
    </div>
  );
}

const DEFAULT_THEME = 'lpt-indigo';

function getStoredTheme(): string {
  return localStorage.getItem('lpt-theme') ?? DEFAULT_THEME;
}

export function ThemeSwitcher() {
  const [current, setCurrent] = useState<string>(getStoredTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', current);
    localStorage.setItem('lpt-theme', current);
  }, [current]);

  const applyTheme = (id: string) => {
    setCurrent(id);
    (document.activeElement as HTMLElement)?.blur();
  };

  function renderTheme(t: ThemeConfig) {
    return (
      <li key={t.id}>
        <button
          onClick={() => applyTheme(t.id)}
          className={cn('flex items-center gap-2.5 px-3 py-2 rounded-lg w-full text-left hover:bg-base-content/10 transition-colors', current === t.id && 'bg-primary/10 text-primary')}
        >
          <ThemeSwatch colors={t.colors} />
          <span className="text-sm flex-1">{t.label}</span>
          {current === t.id && <Check size={13} className="text-primary flex-shrink-0" />}
        </button>
      </li>
    );
  }

  return (
    <div className="dropdown dropdown-end">
      <div tabIndex={0} role="button" className="btn btn-ghost btn-sm gap-1.5">
        <Palette size={16} />
        <span className="hidden sm:inline">Theme</span>
        <ChevronDown size={13} />
      </div>
      <div
        tabIndex={0}
        className="dropdown-content bg-base-200 rounded-box shadow-2xl z-50 p-2 w-56 max-h-[420px] overflow-y-auto mt-1 border border-base-content/[0.08]"
      >
        <p className="px-3 py-1.5 text-[10px] font-bold text-base-content/40 uppercase tracking-widest">
          Custom
        </p>
        <ul className="space-y-0.5">
          {CUSTOM_THEMES.map(renderTheme)}
        </ul>

        <div className="my-2 border-t border-base-content/[0.08]" />

        <p className="px-3 py-1.5 text-[10px] font-bold text-base-content/40 uppercase tracking-widest">
          DaisyUI
        </p>
        <ul className="space-y-0.5">
          {DAISY_THEMES.map(renderTheme)}
        </ul>
      </div>
    </div>
  );
}
