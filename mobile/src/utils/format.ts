import type { LanguageCode } from '../lib/i18n/languages';

// Intl objects are expensive to construct, so we build them once.
const rupeeFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});
const numberFormatter = new Intl.NumberFormat('en-IN');

/** 25000 → "₹25,000"; 125000 → "₹1,25,000" (Indian digit grouping). */
export function formatRupees(amount: number): string {
  return rupeeFormatter.format(Math.round(amount));
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

/** BCP-47 locale for Intl date formatting; Indian English keeps day-month order for every language. */
export function localeFor(language: LanguageCode): string {
  return `${language}-IN`;
}

/** "2026-10-03T…" → "3 Oct 2026" (localised month names). */
export function formatDate(iso: string, language: LanguageCode): string {
  const date = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(localeFor(language), { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

/** "2023-04" → "Apr 2023". */
export function formatMonth(yearMonth: string, language: LanguageCode): string {
  const [year, month] = yearMonth.split('-').map(Number);
  if (!year || !month) return yearMonth;
  return new Intl.DateTimeFormat(localeFor(language), { month: 'short', year: 'numeric' }).format(new Date(year, month - 1, 1));
}

export function formatTime(iso: string, language: LanguageCode): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(localeFor(language), { hour: 'numeric', minute: '2-digit' }).format(date);
}

type RelativeTime =
  | { unit: 'now' }
  | { unit: 'minutes' | 'hours' | 'days'; count: number }
  | { unit: 'date' };

/**
 * Buckets a timestamp for "5 min ago" style labels. The caller turns the bucket into
 * translated text, which keeps this function pure and testable.
 */
export function relativeTime(iso: string, now: number = Date.now()): RelativeTime {
  const diffSec = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (diffSec < 60) return { unit: 'now' };
  if (diffSec < 3600) return { unit: 'minutes', count: Math.floor(diffSec / 60) };
  if (diffSec < 86400) return { unit: 'hours', count: Math.floor(diffSec / 3600) };
  if (diffSec < 7 * 86400) return { unit: 'days', count: Math.floor(diffSec / 86400) };
  return { unit: 'date' };
}

/** 45 → "0:45", 61 → "1:01". */
export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/** Ten-digit Indian mobile → E.164. */
export function toE164(nationalNumber: string): string {
  return `+91${nationalNumber.replace(/\D/g, '').slice(-10)}`;
}

/** "+919876543210" → "+91 98765 43210". */
export function formatPhone(e164: string | null): string {
  if (!e164) return '';
  const digits = e164.replace(/\D/g, '').slice(-10);
  if (digits.length !== 10) return e164;
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

/** Only the last four digits of an Aadhaar number are ever shown. */
export function maskAadhaar(last4: string | null): string {
  return `XXXX XXXX ${last4 && /^\d{4}$/.test(last4) ? last4 : 'XXXX'}`;
}

/** Greeting rule: first name only. "Prasina Selvam" → "Prasina". */
export function firstNameOf(fullName: string | null | undefined): string {
  if (!fullName) return '';
  return fullName.trim().split(/\s+/)[0] ?? '';
}

export function initialsOf(fullName: string | null | undefined): string {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return `${first}${last}`.toUpperCase();
}

/** Whole years between a YYYY-MM-DD birth date and today. */
export function ageFrom(dateOfBirth: string, today: Date = new Date()): number {
  const [year, month, day] = dateOfBirth.split('-').map(Number);
  if (!year || !month || !day) return 0;
  let age = today.getFullYear() - year;
  const beforeBirthday = today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day);
  if (beforeBirthday) age -= 1;
  return age;
}

/** Collapses whitespace and trims — applied to every free-text field before sending. */
export function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/** Keeps paragraph breaks for long messages but trims each line. */
export function normalizeMultiline(value: string): string {
  return value
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Local calendar date as YYYY-MM-DD (not UTC, so "today" matches the user's clock). */
export function toIsoDate(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
