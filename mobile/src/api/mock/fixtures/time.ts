/** Seed timestamps are relative to "now" so the demo always looks fresh ("2 hours ago"). */
export function ago(now: number, parts: { days?: number; hours?: number; minutes?: number }): string {
  const ms = ((parts.days ?? 0) * 24 * 60 + (parts.hours ?? 0) * 60 + (parts.minutes ?? 0)) * 60_000;
  return new Date(now - ms).toISOString();
}

/** Calendar date (YYYY-MM-DD) N days from now; negative values are in the past. */
export function dateFromNow(now: number, days: number): string {
  return new Date(now + days * 86_400_000).toISOString().slice(0, 10);
}
