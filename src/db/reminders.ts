import { db } from "./client";
import { advanceRecurring, type Interval } from "../utils/dates";

export interface Reminder {
  id: string;
  title: string | null;
  body: string;
  type: "once" | "recurring";
  schedule: string;
  next_show: string;
  created_at: string;
  done: number; // 0 | 1
}

export function getDueReminders(today: string): Reminder[] {
  return db
    .prepare<[string], Reminder>("SELECT * FROM reminders WHERE done = 0 AND next_show <= ? ORDER BY next_show ASC")
    .all(today);
}

export function getAllActive(): Reminder[] {
  return db
    .prepare<[], Reminder>("SELECT * FROM reminders WHERE done = 0 ORDER BY next_show ASC")
    .all();
}

export function getArchived(): Reminder[] {
  return db
    .prepare<[], Reminder>("SELECT * FROM reminders WHERE done = 1 ORDER BY created_at DESC")
    .all();
}

export function createReminder(data: {
  id: string;
  title?: string;
  body: string;
  type: "once" | "recurring";
  schedule: string;
  next_show: string;
  created_at: string;
}): void {
  db.prepare(
    `INSERT INTO reminders (id, title, body, type, schedule, next_show, created_at, done)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
  ).run(data.id, data.title ?? null, data.body, data.type, data.schedule, data.next_show, data.created_at);
}

export function acknowledgeReminder(id: string): void {
  const reminder = db.prepare<[string], Reminder>("SELECT * FROM reminders WHERE id = ?").get(id);

  if (!reminder) return;

  if (reminder.type === "once") {
    db.prepare("UPDATE reminders SET done = 1 WHERE id = ?").run(id);
  } else {
    const newNextShow = advanceRecurring(reminder.schedule as Interval, reminder.next_show);
    db.prepare("UPDATE reminders SET next_show = ? WHERE id = ?").run(newNextShow, id);
  }
}

export function updateReminder(
  id: string,
  data: Partial<Pick<Reminder, "title" | "body" | "schedule" | "next_show">>,
): void {
  const fields = Object.keys(data) as (keyof typeof data)[];
  if (fields.length === 0) return;

  const setClauses = fields.map((f) => `${f} = ?`).join(", ");
  const values = fields.map((f) => data[f] ?? null);

  db.prepare(`UPDATE reminders SET ${setClauses} WHERE id = ?`).run(...values, id);
}

export function deleteReminder(id: string): void {
  db.prepare("DELETE FROM reminders WHERE id = ?").run(id);
}
