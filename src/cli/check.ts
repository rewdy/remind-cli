import { hasCheckedToday, writeLastCheck } from "../utils/lastCheck";
import { getDueReminders } from "../db/reminders";
import { todayString } from "../utils/dates";
import { render } from "ink";
import { ReminderCheck } from "../ui/ReminderCheck";
import React from "react";

export async function runCheck(): Promise<void> {
  if (await hasCheckedToday()) {
    process.exit(0);
  }
  await writeLastCheck();
  const due = getDueReminders(todayString());
  if (due.length === 0) {
    process.exit(0);
  }
  const { waitUntilExit } = render(React.createElement(ReminderCheck, { reminders: due }));
  await waitUntilExit();
}
