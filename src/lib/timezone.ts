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
 * Returns current time in HH:mm (24-hour format) in Asia/Kolkata timezone (e.g. "14:30")
 * Ideal for HTML <input type="time" />
 */
export function getCurrentTime24IST(): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: DEFAULT_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

/**
 * Returns current time in HH:mm:ss (24-hour format) in Asia/Kolkata timezone
 */
export function getCurrentTimeIST(): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: DEFAULT_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date());
}

/**
 * Returns current time in 12-hour format with AM/PM in Asia/Kolkata timezone (e.g. "02:30 PM")
 */
export function getCurrentTime12IST(): string {
  return formatTimeIST(new Date());
}

/**
 * Formats a given timestamp, Date, or time string to 12-hour time in Asia/Kolkata (e.g. "09:30 AM")
 * Handles:
 * - Time-only strings (e.g. "14:46:34.66142", "14:46", "02:30 PM")
 * - ISO date-time strings (e.g. "2026-10-15T09:16:34Z")
 * - JavaScript Date objects
 */
export function formatTimeIST(timeOrDate?: string | Date | null): string {
  if (!timeOrDate) return '--:--';

  if (typeof timeOrDate === 'string') {
    const trimmed = timeOrDate.trim();
    if (!trimmed) return '--:--';

    // 1. Check if already 12h formatted like "09:30 AM" or "9:30 pm"
    const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
    if (ampmMatch) {
      let h = parseInt(ampmMatch[1], 10);
      const m = ampmMatch[2];
      const ap = ampmMatch[3].toUpperCase();
      if (h === 0) h = 12;
      return `${h.toString().padStart(2, '0')}:${m} ${ap}`;
    }

    // 2. Check if time-only string like "14:46:34.66142", "14:46:34", "14:46", "9:05"
    const timeOnlyMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?$/);
    if (timeOnlyMatch) {
      let h = parseInt(timeOnlyMatch[1], 10);
      const m = timeOnlyMatch[2];
      const ap = h >= 12 ? 'PM' : 'AM';
      h = h % 12;
      if (h === 0) h = 12;
      return `${h.toString().padStart(2, '0')}:${m} ${ap}`;
    }
  }

  try {
    const date = typeof timeOrDate === 'string' ? new Date(timeOrDate) : timeOrDate;
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
 * Formats a trip's display time, prioritizing the trip's dedicated trip_time if available,
 * and falling back to its created_at timestamp.
 */
export function formatTripTime(trip?: { trip_time?: string | null; created_at?: string | null } | null): string {
  if (!trip) return '--:--';
  if (trip.trip_time) {
    return formatTimeIST(trip.trip_time);
  }
  return formatTimeIST(trip.created_at);
}

/**
 * Formats a given timestamp or date to date + time in Asia/Kolkata (e.g. "22 Sep 2026, 06:20 PM")
 */
export function formatDateTimeIST(dateStringOrDate?: string | Date | null, timeString?: string | null): string {
  if (!dateStringOrDate) return '--';

  // If time string is separately provided (e.g. from trip_time)
  if (timeString && typeof dateStringOrDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStringOrDate.trim())) {
    const datePart = formatDateIST(dateStringOrDate);
    const timePart = formatTimeIST(timeString);
    return `${datePart}, ${timePart}`;
  }

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
 * Avoids UTC timezone day-rollover issues for YYYY-MM-DD strings.
 */
export function formatDateIST(dateStringOrDate?: string | Date | null): string {
  if (!dateStringOrDate) return '--';

  if (typeof dateStringOrDate === 'string') {
    const dateOnlyMatch = dateStringOrDate.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnlyMatch) {
      const year = parseInt(dateOnlyMatch[1], 10);
      const month = parseInt(dateOnlyMatch[2], 10) - 1;
      const day = parseInt(dateOnlyMatch[3], 10);
      const d = new Date(year, month, day, 12, 0, 0);
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: DEFAULT_TIMEZONE,
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(d);
    }
  }

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
