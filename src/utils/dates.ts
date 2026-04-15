import {
  addDays,
  addMonths,
  startOfMonth,
  nextSunday,
  format,
  parseISO,
  startOfDay,
} from "date-fns";

export type Interval =
  | "daily"
  | "weekly"
  | "monthly"
  | "every 2 months"
  | "every 3 months"
  | "every 6 months"
  | "every year";

// Returns YYYY-MM-DD string for the start of the NEXT occurrence
// from is the reference date (defaults to today)
export function computeNextShow(interval: Interval, from?: Date): string {
  const base = startOfDay(from ?? new Date());

  switch (interval) {
    case "daily":
      return format(addDays(base, 1), "yyyy-MM-dd");

    case "weekly": {
      // nextSunday always returns the strictly next Sunday (never the same day),
      // so a single call handles both Sunday and non-Sunday inputs correctly.
      return format(nextSunday(base), "yyyy-MM-dd");
    }

    case "monthly":
      return format(startOfMonth(addMonths(base, 1)), "yyyy-MM-dd");

    case "every 2 months":
      return format(startOfMonth(addMonths(base, 2)), "yyyy-MM-dd");

    case "every 3 months":
      return format(startOfMonth(addMonths(base, 3)), "yyyy-MM-dd");

    case "every 6 months":
      return format(startOfMonth(addMonths(base, 6)), "yyyy-MM-dd");

    case "every year":
      return format(startOfMonth(addMonths(base, 12)), "yyyy-MM-dd");
  }
}

// Advance an existing next_show to the following occurrence
// currentNextShow is a YYYY-MM-DD string
export function advanceRecurring(interval: Interval, currentNextShow: string): string {
  const current = parseISO(currentNextShow);
  return computeNextShow(interval, current);
}

// Format a Date or YYYY-MM-DD string for display e.g. "Mon, Apr 20"
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "EEE, MMM d");
}

// Today as YYYY-MM-DD
export function todayString(): string {
  return format(startOfDay(new Date()), "yyyy-MM-dd");
}
