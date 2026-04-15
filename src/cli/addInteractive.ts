import { intro, outro, text, select, confirm, cancel, isCancel } from "@clack/prompts";
import { randomUUID } from "crypto";
import { parseISO, isValid } from "date-fns";
import { createReminder } from "../db/reminders";
import { computeNextShow, todayString } from "../utils/dates";
import type { Interval } from "../utils/dates";

function validateDate(value: string | undefined): string | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return "Date must be in YYYY-MM-DD format (e.g. 2026-05-01)";
  }
  const parsed = parseISO(value);
  if (!isValid(parsed)) {
    return "Invalid date — please enter a real date";
  }
  if (value < todayString()) {
    return "Date must not be in the past";
  }
  return undefined;
}

export async function runAddInteractive(): Promise<void> {
  intro("Create a reminder");

  const body = await text({
    message: "What do you want to be reminded of?",
    placeholder: "e.g. Review quarterly goals",
    validate: (v) => (!v?.trim() ? "Body is required" : undefined),
  });

  if (isCancel(body)) {
    cancel("Cancelled.");
    process.exit(0);
  }

  const titleResult = await text({
    message: "Add a title? (optional — press Enter to skip)",
    placeholder: "Leave blank to skip",
  });

  if (isCancel(titleResult)) {
    cancel("Cancelled.");
    process.exit(0);
  }

  const type = await select({
    message: "Reminder type",
    options: [
      { value: "once" as const, label: "One time — show once on a specific date" },
      { value: "recurring" as const, label: "Recurring — repeat on an interval" },
    ],
  });

  if (isCancel(type)) {
    cancel("Cancelled.");
    process.exit(0);
  }

  let date: string | undefined;
  let interval: Interval | undefined;

  if (type === "once") {
    const dateResult = await text({
      message: "Show on date",
      placeholder: "YYYY-MM-DD, e.g. 2026-05-01",
      validate: validateDate,
    });

    if (isCancel(dateResult)) {
      cancel("Cancelled.");
      process.exit(0);
    }

    date = dateResult as string;
  } else {
    const intervalResult = await select<Interval>({
      message: "Repeat every...",
      options: [
        { value: "daily" as Interval },
        { value: "weekly" as Interval },
        { value: "monthly" as Interval },
        { value: "every 3 months" as Interval },
        { value: "every 6 months" as Interval },
        { value: "every year" as Interval },
      ],
    });

    if (isCancel(intervalResult)) {
      cancel("Cancelled.");
      process.exit(0);
    }

    interval = intervalResult as Interval;
  }

  const confirmed = await confirm({ message: "Create this reminder?" });

  if (isCancel(confirmed) || !confirmed) {
    cancel("Cancelled.");
    process.exit(0);
  }

  const id = randomUUID();
  const title =
    typeof titleResult === "string" && titleResult.trim() ? titleResult.trim() : null;
  const schedule = type === "once" ? (date as string) : (interval as Interval);
  const next_show = type === "once" ? (date as string) : computeNextShow(interval as Interval);
  const created_at = new Date().toISOString();

  createReminder({
    id,
    title: title ?? undefined,
    body: (body as string).trim(),
    type,
    schedule,
    next_show,
    created_at,
  });

  outro("Reminder created! ✓");
}
