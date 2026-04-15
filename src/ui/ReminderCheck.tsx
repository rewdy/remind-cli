import { useState, useEffect } from "react";
import { Box, Text, useInput, useApp } from "ink";
import { type Reminder, acknowledgeReminder } from "../db/reminders";
import { formatDate } from "../utils/dates";

interface Props {
  reminders: Reminder[];
}

type Mode =
  | { type: "multi"; selectedIndex: number }
  | { type: "single"; reminderIndex: number; selectedAction: number }
  | { type: "snooze" };

export function ReminderCheck({ reminders }: Props) {
  const { exit } = useApp();
  const [mode, setMode] = useState<Mode>(
    reminders.length === 1
      ? { type: "single", reminderIndex: 0, selectedAction: 0 }
      : { type: "multi", selectedIndex: 0 }
  );

  useEffect(() => {
    if (mode.type === "snooze") {
      const timer = setTimeout(() => exit(), 1500);
      return () => clearTimeout(timer);
    }
  }, [mode.type]);

  useInput((_input, key) => {
    if (mode.type === "multi") {
      if (key.upArrow) {
        setMode({ type: "multi", selectedIndex: Math.max(0, mode.selectedIndex - 1) });
      }
      if (key.downArrow) {
        setMode({ type: "multi", selectedIndex: Math.min(2, mode.selectedIndex + 1) });
      }
      if (key.return) {
        if (mode.selectedIndex === 0) {
          // Acknowledge all
          for (const r of reminders) acknowledgeReminder(r.id);
          exit();
        } else if (mode.selectedIndex === 1) {
          // Snooze all
          setMode({ type: "snooze" });
        } else {
          // Review individually
          setMode({ type: "single", reminderIndex: 0, selectedAction: 0 });
        }
      }
    } else if (mode.type === "single") {
      if (key.leftArrow) setMode({ ...mode, selectedAction: 0 });
      if (key.rightArrow) setMode({ ...mode, selectedAction: 1 });
      if (key.return) {
        if (mode.selectedAction === 0) {
          // Acknowledge
          acknowledgeReminder(reminders[mode.reminderIndex]!.id);
          if (mode.reminderIndex + 1 < reminders.length) {
            setMode({ type: "single", reminderIndex: mode.reminderIndex + 1, selectedAction: 0 });
          } else {
            exit();
          }
        } else {
          // Snooze
          setMode({ type: "snooze" });
        }
      }
    }
  });

  if (mode.type === "snooze") {
    return (
      <Box paddingX={2} paddingY={1}>
        <Text>
          Snoozed. You can review your reminders anytime by running{" "}
          <Text bold>`remind`</Text>.
        </Text>
      </Box>
    );
  }

  if (mode.type === "multi") {
    const actions = ["Acknowledge all", "Snooze all", "Review individually..."];
    return (
      <Box borderStyle="round" flexDirection="column" paddingX={2} paddingY={1}>
        <Text bold>{reminders.length} Reminders Due</Text>
        <Box marginTop={1} flexDirection="column">
          {reminders.map((r) => (
            <Text key={r.id}>
              {"• "}{r.title ?? (r.body.length > 60 ? r.body.slice(0, 60) + "…" : r.body)}
            </Text>
          ))}
        </Box>
        <Box marginTop={1} flexDirection="column">
          {actions.map((action, i) => (
            <Text key={action} inverse={mode.selectedIndex === i}>
              {action}
            </Text>
          ))}
        </Box>
      </Box>
    );
  }

  // single mode
  const reminder = reminders[mode.reminderIndex]!;
  const actionLabels = ["Acknowledge", "Snooze"];
  return (
    <Box borderStyle="round" flexDirection="column" paddingX={2} paddingY={1}>
      {reminder.title && <Text bold>{reminder.title}</Text>}
      <Text>{reminder.body}</Text>
      <Text dimColor>Due: {formatDate(reminder.next_show)}</Text>
      <Box marginTop={1} gap={2}>
        {actionLabels.map((label, i) => (
          <Text key={label} inverse={mode.selectedAction === i}>
            {label}
          </Text>
        ))}
      </Box>
    </Box>
  );
}
