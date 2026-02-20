/**
 * Timezone Utilities for Colombia Time (COT)
 *
 * Colombia uses Colombia Time (COT) which is UTC-5 all year round.
 * Colombia does NOT observe Daylight Saving Time.
 *
 * Market Hours: 8:00 AM - 1:00 PM COT
 */

export const COLOMBIA_TIMEZONE = 'America/Bogota';

/**
 * Market hours configuration
 */
export const MARKET_HOURS = {
  open: 8, // 8:00 AM COT
  close: 13, // 1:00 PM COT (13:00 in 24-hour format)
} as const;

/**
 * Convert UTC Date to Colombia Time
 */
export function toColombiaTime(date: Date): Date {
  return new Date(date.toLocaleString('en-US', { timeZone: COLOMBIA_TIMEZONE }));
}

/**
 * Get current time in Colombia
 */
export function getColombiaTime(): Date {
  return toColombiaTime(new Date());
}

/**
 * Check if current time is during market hours (8 AM - 1 PM COT)
 */
export function isMarketHours(date?: Date): boolean {
  const colombiaTime = date ? toColombiaTime(date) : getColombiaTime();
  const hour = colombiaTime.getHours();
  return hour >= MARKET_HOURS.open && hour < MARKET_HOURS.close;
}

/**
 * Format date to Colombia date string (YYYY-MM-DD)
 */
export function toColombiaDateString(date: Date): string {
  const colombiaTime = toColombiaTime(date);
  return colombiaTime.toISOString().split('T')[0];
}

/**
 * Get market status message
 */
export function getMarketStatus(): {
  isOpen: boolean;
  message: string;
  hour: number;
} {
  const colombiaTime = getColombiaTime();
  const hour = colombiaTime.getHours();
  const isOpen = isMarketHours();

  let message: string;
  if (isOpen) {
    message = `Market is OPEN (${hour}:00 COT)`;
  } else if (hour < MARKET_HOURS.open) {
    message = `Market opens at ${MARKET_HOURS.open}:00 AM COT`;
  } else {
    message = `Market closed at ${MARKET_HOURS.close}:00 PM COT`;
  }

  return { isOpen, message, hour };
}

/**
 * Convert UTC timestamp to Colombia Time formatted string
 * @param utcDate - UTC Date object
 * @returns Formatted string like "2026-01-08 09:30:00 COT"
 */
export function formatColombiaTime(utcDate: Date): string {
  const colombiaTime = toColombiaTime(utcDate);
  const date = colombiaTime.toISOString().split('T')[0];
  const time = colombiaTime.toTimeString().split(' ')[0];
  return `${date} ${time} COT`;
}

/**
 * Get time difference between UTC and Colombia Time
 * @returns Offset in hours (always -5 for Colombia)
 */
export function getColombiaOffset(): number {
  return -5; // Colombia is always UTC-5
}

/**
 * Parse Colombia date string (YYYY-MM-DD) to UTC Date
 * Assumes 00:00:00 time if no time is provided
 */
export function parseColombiaDate(dateString: string): Date {
  // Parse date in Colombia timezone
  const [year, month, day] = dateString.split('-').map(Number);
  const colombiaDate = new Date(year, month - 1, day, 0, 0, 0);

  // Convert to UTC by adding the offset
  const utcDate = new Date(colombiaDate.getTime() - (getColombiaOffset() * 60 * 60 * 1000));
  return utcDate;
}

/**
 * Get next market opening time
 */
export function getNextMarketOpen(): Date {
  const colombiaTime = getColombiaTime();
  const hour = colombiaTime.getHours();

  if (hour < MARKET_HOURS.open) {
    // Market opens today
    colombiaTime.setHours(MARKET_HOURS.open, 0, 0, 0);
  } else {
    // Market opens tomorrow
    colombiaTime.setDate(colombiaTime.getDate() + 1);
    colombiaTime.setHours(MARKET_HOURS.open, 0, 0, 0);
  }

  return colombiaTime;
}

/**
 * Calculate seconds until market opens
 */
export function getSecondsUntilMarketOpen(): number {
  const now = getColombiaTime();
  const nextOpen = getNextMarketOpen();
  return Math.floor((nextOpen.getTime() - now.getTime()) / 1000);
}
