import daisyui from 'daisyui';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '2rem', screens: { '2xl': '1400px' } },
    extend: {
      fontFamily: {
        sans: ['Inter Variable', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        'fade-in': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'slide-in': { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(0)' } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-in': 'slide-in 0.25s ease-out',
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        'lpt-indigo': {
          primary: '#6366f1',
          'primary-content': '#ffffff',
          secondary: '#8b5cf6',
          'secondary-content': '#ffffff',
          accent: '#22c55e',
          'accent-content': '#ffffff',
          neutral: '#1e293b',
          'neutral-content': '#94a3b8',
          'base-100': '#070b14',  // page bg — deepest dark
          'base-200': '#0f1729',  // card bg — clearly lighter
          'base-300': '#1a2744',  // input bg — even lighter
          'base-content': '#e2e8f0',
          info: '#3b82f6',
          'info-content': '#ffffff',
          success: '#22c55e',
          'success-content': '#ffffff',
          warning: '#f59e0b',
          'warning-content': '#000000',
          error: '#ef4444',
          'error-content': '#ffffff',
        },
      },
      {
        'lpt-slate': {
          primary: '#818cf8',
          'primary-content': '#ffffff',
          secondary: '#a78bfa',
          'secondary-content': '#ffffff',
          accent: '#34d399',
          'accent-content': '#ffffff',
          neutral: '#334155',
          'neutral-content': '#cbd5e1',
          'base-100': '#0d1117',  // page bg
          'base-200': '#1c2334',  // card bg — clearly lighter
          'base-300': '#28333f',  // input bg — even lighter
          'base-content': '#e6edf3',
          info: '#58a6ff',
          'info-content': '#000000',
          success: '#3fb950',
          'success-content': '#000000',
          warning: '#d29922',
          'warning-content': '#000000',
          error: '#f85149',
          'error-content': '#ffffff',
        },
      },
      {
        'lpt-rose': {
          primary: '#f43f5e',
          'primary-content': '#ffffff',
          secondary: '#e879f9',
          'secondary-content': '#ffffff',
          accent: '#fb923c',
          'accent-content': '#ffffff',
          neutral: '#2d1b20',
          'neutral-content': '#fda4af',
          'base-100': '#0f0508',  // page bg
          'base-200': '#21101a',  // card bg — clearly lighter
          'base-300': '#32192a',  // input bg — even lighter
          'base-content': '#fce4e9',
          info: '#38bdf8',
          'info-content': '#000000',
          success: '#4ade80',
          'success-content': '#000000',
          warning: '#fbbf24',
          'warning-content': '#000000',
          error: '#ef4444',
          'error-content': '#ffffff',
        },
      },
      {
        'lpt-emerald': {
          primary: '#10b981',
          'primary-content': '#ffffff',
          secondary: '#14b8a6',
          'secondary-content': '#ffffff',
          accent: '#6366f1',
          'accent-content': '#ffffff',
          neutral: '#1a2e22',
          'neutral-content': '#6ee7b7',
          'base-100': '#05100a',  // page bg
          'base-200': '#0d2217',  // card bg — clearly lighter
          'base-300': '#163828',  // input bg — even lighter
          'base-content': '#d1fae5',
          info: '#38bdf8',
          'info-content': '#000000',
          success: '#22c55e',
          'success-content': '#000000',
          warning: '#fbbf24',
          'warning-content': '#000000',
          error: '#f87171',
          'error-content': '#ffffff',
        },
      },
      {
        'lpt-light': {
          primary: '#6366f1',
          'primary-content': '#ffffff',
          secondary: '#8b5cf6',
          'secondary-content': '#ffffff',
          accent: '#22c55e',
          'accent-content': '#ffffff',
          neutral: '#e2e8f0',
          'neutral-content': '#334155',
          'base-100': '#f8fafc',
          'base-200': '#f1f5f9',
          'base-300': '#e2e8f0',
          'base-content': '#0f172a',
          info: '#3b82f6',
          'info-content': '#ffffff',
          success: '#22c55e',
          'success-content': '#ffffff',
          warning: '#f59e0b',
          'warning-content': '#000000',
          error: '#ef4444',
          'error-content': '#ffffff',
        },
      },
      'light', 'dark', 'cupcake', 'bumblebee', 'emerald', 'corporate',
      'synthwave', 'retro', 'cyberpunk', 'valentine', 'halloween', 'garden',
      'forest', 'aqua', 'lofi', 'pastel', 'fantasy', 'wireframe', 'black',
      'luxury', 'dracula', 'cmyk', 'autumn', 'business', 'acid', 'lemonade',
      'night', 'coffee', 'winter', 'dim', 'nord', 'sunset',
    ],
    darkTheme: 'lpt-indigo',
    base: true,
    styled: true,
    utils: true,
    logs: false,
  },
};
