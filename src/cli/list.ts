import React from "react";
import { render } from "ink";
import { ReminderList } from "../ui/ReminderList";
import { getAllActive, getArchived } from "../db/reminders";

export async function runList(): Promise<void> {
  const active = getAllActive();
  const archived = getArchived();
  const { waitUntilExit } = render(
    React.createElement(ReminderList, { initialActive: active, initialArchived: archived }),
  );
  await waitUntilExit();
}
