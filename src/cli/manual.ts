import { getDueReminders } from "../db/reminders";
import { todayString } from "../utils/dates";
import { render } from "ink";
import { ReminderCheck } from "../ui/ReminderCheck";
import React from "react";

export async function runManual(): Promise<void> {
  const due = getDueReminders(todayString());
  if (due.length === 0) {
    console.log("No reminders due. Run `remind list` to see all reminders.");
    return;
  }
  const { waitUntilExit } = render(React.createElement(ReminderCheck, { reminders: due }));
  await waitUntilExit();
}
