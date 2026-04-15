import { test, expect, describe } from "bun:test";
import { parseISO, getDay } from "date-fns";
import { computeNextShow, advanceRecurring, todayString } from "./dates";

// Use local-time date construction to avoid UTC-midnight timezone issues
function localDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

describe("computeNextShow", () => {
  test("daily returns tomorrow's date", () => {
    // April 15, 2026 is a Wednesday
    const from = localDate(2026, 4, 15);
    const result = computeNextShow("daily", from);
    expect(result).toBe("2026-04-16");
  });

  test("weekly returns a Sunday", () => {
    // April 15, 2026 is a Wednesday
    const from = localDate(2026, 4, 15);
    const result = computeNextShow("weekly", from);
    const day = getDay(parseISO(result));
    expect(day).toBe(0); // 0 = Sunday
  });

  test("weekly when today is Sunday returns the NEXT Sunday (not today)", () => {
    // April 19, 2026 is a Sunday
    const from = localDate(2026, 4, 19);
    const result = computeNextShow("weekly", from);
    // Should not return the same day
    expect(result).not.toBe("2026-04-19");
    // Should be a Sunday
    expect(getDay(parseISO(result))).toBe(0);
    // Should be exactly 7 days later
    expect(result).toBe("2026-04-26");
  });

  test("monthly returns the 1st of next month", () => {
    const from = localDate(2026, 4, 15);
    const result = computeNextShow("monthly", from);
    expect(result).toBe("2026-05-01");
  });

  test("every 3 months returns the 1st of the month 3 months out", () => {
    const from = localDate(2026, 4, 15);
    const result = computeNextShow("every 3 months", from);
    expect(result).toBe("2026-07-01");
  });

  test("every year returns the 1st of the month 12 months out", () => {
    const from = localDate(2026, 4, 15);
    const result = computeNextShow("every year", from);
    expect(result).toBe("2027-04-01");
  });
});

describe("advanceRecurring", () => {
  test("monthly advances from 2026-04-01 to 2026-05-01", () => {
    const result = advanceRecurring("monthly", "2026-04-01");
    expect(result).toBe("2026-05-01");
  });

  test("weekly advances from 2026-04-19 (Sunday) to next Sunday", () => {
    // 2026-04-19 is a Sunday; advancing should produce 2026-04-26
    const result = advanceRecurring("weekly", "2026-04-19");
    expect(result).toBe("2026-04-26");
    expect(getDay(parseISO(result))).toBe(0);
  });
});

describe("todayString", () => {
  test("returns a string matching YYYY-MM-DD format", () => {
    const result = todayString();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
