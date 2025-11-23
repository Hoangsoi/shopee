// Utility functions for Vietnam timezone (UTC+7)

/**
 * Get current time in Vietnam timezone (UTC+7)
 */
export function getVietnamTime(): Date {
  const now = new Date();
  // Get UTC time
  const utc = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  // Convert to Vietnam time (UTC+7)
  const vietnamTime = new Date(utc + (7 * 60 * 60 * 1000));
  return vietnamTime;
}

/**
 * Convert a date to Vietnam timezone (UTC+7)
 */
export function toVietnamTime(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  // Get UTC time
  const utc = d.getTime() + (d.getTimezoneOffset() * 60 * 1000);
  // Convert to Vietnam time (UTC+7)
  const vietnamTime = new Date(utc + (7 * 60 * 60 * 1000));
  return vietnamTime;
}

/**
 * Create a date in Vietnam timezone from date components
 */
export function createVietnamDate(year: number, month: number, day: number, hour: number = 0, minute: number = 0, second: number = 0): Date {
  // Create date string in Vietnam timezone format
  const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}+07:00`;
  return new Date(dateString);
}

/**
 * Add days to a date in Vietnam timezone, preserving the time
 * This adds exactly 24 hours * days to the date
 */
export function addDaysVietnamTime(date: Date, days: number): Date {
  // Create a new date object to avoid mutation
  const result = new Date(date);
  // Add exactly days * 24 hours in milliseconds
  result.setTime(result.getTime() + (days * 24 * 60 * 60 * 1000));
  return result;
}

/**
 * Format date to Vietnam timezone string for database storage
 * Returns ISO string that represents the correct Vietnam time
 */
export function toVietnamTimeISO(date: Date): string {
  const vietnamDate = toVietnamTime(date);
  // Return as ISO string - database will store this correctly
  return vietnamDate.toISOString();
}

