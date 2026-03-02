import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format WER as accuracy percentage string */
export function werToAccuracy(wer: number | null | undefined): string {
  if (wer === null || wer === undefined) return '—';
  const accuracy = Math.max(0, (1 - Math.min(wer, 1)) * 100);
  return `${accuracy.toFixed(1)}%`;
}

/** Format WER as number */
export function werToAccuracyNumber(wer: number): number {
  return Math.max(0, (1 - Math.min(wer, 1)) * 100);
}

/** Format ISO datetime to a human-readable string */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Format ISO datetime as date only */
export function formatDateOnly(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Capitalize first letter */
export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/** Language code to display name mapping */
const LANGUAGE_NAMES: Record<string, string> = {
  'en': 'English',
  'en-US': 'English (US)',
  'en-GB': 'English (UK)',
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'zh': 'Chinese',
  'ja': 'Japanese',
  'ko': 'Korean',
  'ar': 'Arabic',
  'hi': 'Hindi',
  'pt': 'Portuguese',
  'ru': 'Russian',
  'it': 'Italian',
};

export function getLanguageName(code: string): string {
  return LANGUAGE_NAMES[code] ?? code;
}

/** Truncate long strings */
export function truncate(s: string, maxLen: number = 60): string {
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen) + '…';
}

/** Generate initials from a name */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0].toUpperCase())
    .join('');
}
