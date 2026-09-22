/**
 * Timezone utilities for Fleet Management App
 * Standard Timezone: Asia/Kolkata (IST: UTC+05:30)
 */

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

/**
 * Returns today's date in YYYY-MM-DD in Asia/Kolkata timezone
 */
export function getTodayDateIST(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: DEFAULT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now); // en-CA outputs YYYY-MM-DD
}

/**
 * Formats a given timestamp to time string in Asia/Kolkata (e.g. "09:30 AM")
 */
export function formatTimeIST(dateStringOrDate?: string | Date | null): string {
  if (!dateStringOrDate) return '--:--';
  try {
    const date = typeof dateStringOrDate === 'string' ? new Date(dateStringOrDate) : dateStringOrDate;
    if (isNaN(date.getTime())) return '--:--';

    return new Intl.DateTimeFormat('en-IN', {
      timeZone: DEFAULT_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return '--:--';
  }
}

/**
 * Formats a given timestamp to date + time in Asia/Kolkata (e.g. "22 Sep 2026, 06:20 PM")
 */
export function formatDateTimeIST(dateStringOrDate?: string | Date | null): string {
  if (!dateStringOrDate) return '--';
  try {
    const date = typeof dateStringOrDate === 'string' ? new Date(dateStringOrDate) : dateStringOrDate;
    if (isNaN(date.getTime())) return '--';

    return new Intl.DateTimeFormat('en-IN', {
      timeZone: DEFAULT_TIMEZONE,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return '--';
  }
}

/**
 * Formats a date string (YYYY-MM-DD or ISO) to display format (e.g. "22 Sep 2026")
 */
export function formatDateIST(dateStringOrDate?: string | Date | null): string {
  if (!dateStringOrDate) return '--';
  try {
    const date = typeof dateStringOrDate === 'string' ? new Date(dateStringOrDate) : dateStringOrDate;
    if (isNaN(date.getTime())) return '--';

    return new Intl.DateTimeFormat('en-IN', {
      timeZone: DEFAULT_TIMEZONE,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return '--';
  }
}

/**
 * Calculates human-readable duration between start and end (or current time if end is null)
 */
export function calculateWorkingHours(
  startTimeIso?: string | null,
  endTimeIso?: string | null
): { text: string; hoursDecimal: number; totalMinutes: number } {
  if (!startTimeIso) {
    return { text: '0h 00m', hoursDecimal: 0, totalMinutes: 0 };
  }

  const start = new Date(startTimeIso).getTime();
  const end = endTimeIso ? new Date(endTimeIso).getTime() : Date.now();

  if (isNaN(start) || isNaN(end) || end < start) {
    return { text: '0h 00m', hoursDecimal: 0, totalMinutes: 0 };
  }

  const diffMs = end - start;
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const hoursDecimal = parseFloat((totalMinutes / 60).toFixed(2));

  return {
    text: `${hours}h ${minutes.toString().padStart(2, '0')}m`,
    hoursDecimal,
    totalMinutes,
  };
}

/**
 * Formats Indian Currency (INR ₹)
 */
export function formatCurrencyINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}
