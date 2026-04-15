import React, { useState } from "react";
import { Box, Text, useInput, useApp } from "ink";
import { type Reminder, getAllActive, getArchived, deleteReminder } from "../db/reminders";
import { formatDate } from "../utils/dates";

interface Props {
  initialActive: Reminder[];
  initialArchived: Reminder[];
}

type Screen = "list" | "detail";

function typeLabel(r: Reminder): string {
  if (r.type === "once") return "once";
  switch (r.schedule) {
    case "daily":
      return "↻ daily";
    case "weekly":
      return "↻ weekly";
    case "monthly":
      return "↻ monthly";
    case "every 2 months":
      return "↻ 2mo";
    case "every 3 months":
      return "↻ 3mo";
    case "every 6 months":
      return "↻ 6mo";
    case "every year":
      return "↻ yearly";
    default:
      return `↻ ${r.schedule}`;
  }
}

function titlePreview(r: Reminder): string {
  const text = r.title ?? r.body;
  if (text.length > 55) return text.slice(0, 54) + "…";
  return text;
}

function wrapText(text: string, width: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (current.length === 0) {
      current = word;
    } else if (current.length + 1 + word.length <= width) {
      current += " " + word;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current.length > 0) lines.push(current);
  return lines;
}

export function ReminderList({ initialActive, initialArchived }: Props) {
  const { exit } = useApp();
  const [screen, setScreen] = useState<Screen>("list");
  const [active, setActive] = useState<Reminder[]>(initialActive);
  const [archived, setArchived] = useState<Reminder[]>(initialArchived);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showArchived, setShowArchived] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  // detail screen: 0 = Delete, 1 = Back
  const [detailAction, setDetailAction] = useState(0);
  const [detailDeleteConfirm, setDetailDeleteConfirm] = useState(false);

  const visibleRows: Reminder[] = showArchived ? [...active, ...archived] : [...active];

  const totalRows = visibleRows.length;

  const selectedReminder: Reminder | null =
    selectedIndex < totalRows ? (visibleRows[selectedIndex] ?? null) : null;

  const detailReminder =
    detailId != null ? ([...active, ...archived].find((r) => r.id === detailId) ?? null) : null;

  function refreshData() {
    const newActive = getAllActive();
    const newArchived = getArchived();
    setActive(newActive);
    setArchived(newArchived);
    return { newActive, newArchived };
  }

  useInput((input, key) => {
    if (screen === "list") {
      if (deleteConfirm) {
        if (input === "d" && selectedReminder != null) {
          deleteReminder(selectedReminder.id);
          const { newActive, newArchived } = refreshData();
          setDeleteConfirm(false);
          const newVisible = showArchived ? [...newActive, ...newArchived] : [...newActive];
          const newMax = newVisible.length - 1;
          if (selectedIndex > newMax) {
            setSelectedIndex(Math.max(0, newMax));
          }
        } else {
          setDeleteConfirm(false);
        }
        return;
      }

      if (key.upArrow) {
        setSelectedIndex((i) => Math.max(0, i - 1));
      } else if (key.downArrow) {
        setSelectedIndex((i) => Math.min(totalRows - 1, i + 1));
      } else if (key.return && selectedReminder != null) {
        setDetailId(selectedReminder.id);
        setDetailAction(1); // default to Back
        setDetailDeleteConfirm(false);
        setScreen("detail");
      } else if (input === "d" && selectedReminder != null) {
        setDeleteConfirm(true);
      } else if (input === "a") {
        setShowArchived((v) => !v);
        setSelectedIndex(0);
        setDeleteConfirm(false);
      } else if (input === "q" || key.escape) {
        exit();
      }
    } else if (screen === "detail") {
      if (detailDeleteConfirm) {
        if (key.return && detailReminder != null) {
          deleteReminder(detailReminder.id);
          refreshData();
          setDetailDeleteConfirm(false);
          setDetailId(null);
          setScreen("list");
          setSelectedIndex(0);
        } else {
          setDetailDeleteConfirm(false);
        }
        return;
      }

      if (key.escape || input === "b") {
        setScreen("list");
        setDetailId(null);
        setDeleteConfirm(false);
        setDetailDeleteConfirm(false);
      } else if (key.leftArrow || input === "h") {
        if (detailReminder != null && detailReminder.done === 0) {
          setDetailAction((a) => Math.max(0, a - 1));
        }
      } else if (key.rightArrow || input === "l") {
        if (detailReminder != null && detailReminder.done === 0) {
          setDetailAction((a) => Math.min(1, a + 1));
        }
      } else if (key.return) {
        if (detailReminder != null && detailReminder.done === 0 && detailAction === 0) {
          // Delete action
          setDetailDeleteConfirm(true);
        } else {
          // Back action
          setScreen("list");
          setDetailId(null);
          setDeleteConfirm(false);
        }
      }
    }
  });

  if (screen === "detail") {
    return (
      <DetailScreen
        reminder={detailReminder}
        selectedAction={detailAction}
        deleteConfirm={detailDeleteConfirm}
      />
    );
  }

  return (
    <ListScreen
      active={active}
      archived={archived}
      visibleRows={visibleRows}
      selectedIndex={selectedIndex}
      showArchived={showArchived}
      deleteConfirm={deleteConfirm}
      selectedReminder={selectedReminder}
    />
  );
}

interface ListScreenProps {
  active: Reminder[];
  archived: Reminder[];
  visibleRows: Reminder[];
  selectedIndex: number;
  showArchived: boolean;
  deleteConfirm: boolean;
  selectedReminder: Reminder | null;
}

function ListScreen({
  active,
  archived,
  visibleRows,
  selectedIndex,
  showArchived,
  deleteConfirm,
  selectedReminder,
}: ListScreenProps) {
  const hasAny = active.length > 0 || archived.length > 0;

  const TYPE_W = 10;
  const TITLE_W = 45;
  const DUE_W = 14;

  const pad = (s: string, w: number) =>
    s.length >= w ? s.slice(0, w) : s + " ".repeat(w - s.length);

  return (
    <Box flexDirection="column" paddingTop={1} paddingLeft={2} paddingRight={2}>
      {/* Header bar */}
      <Box justifyContent="space-between" marginBottom={1}>
        <Text bold>remind list</Text>
        <Text dimColor>
          {showArchived ? "[a] hide archived" : "[a] archived"}
          {"  "}[q] quit
        </Text>
      </Box>

      {/* Column headers */}
      <Box>
        <Text dimColor>{pad("TYPE", TYPE_W)}</Text>
        <Text dimColor>{pad("TITLE / BODY", TITLE_W)}</Text>
        <Text dimColor>{pad("NEXT DUE", DUE_W)}</Text>
      </Box>

      {/* Separator */}
      <Box>
        <Text dimColor>{"─".repeat(TYPE_W + TITLE_W + DUE_W)}</Text>
      </Box>

      {/* Rows */}
      {!hasAny || (!showArchived && active.length === 0) ? (
        <Box marginTop={1}>
          <Text dimColor>No reminders yet. Run `remind add` to create one.</Text>
        </Box>
      ) : (
        <>
          {visibleRows.map((r, i) => {
            const isSelected = i === selectedIndex;
            const prefix = isSelected ? "▶ " : "  ";
            // Show archived separator: first archived row when showArchived is true
            const isFirstArchived = showArchived && i === active.length && archived.length > 0;

            return (
              <React.Fragment key={r.id}>
                {isFirstArchived && (
                  <Box marginTop={1} marginBottom={1}>
                    <Text dimColor>── Archived ──</Text>
                  </Box>
                )}
                <Box>
                  <Text bold={isSelected}>
                    {prefix}
                    {pad(typeLabel(r), TYPE_W - 2)}
                    {"  "}
                    {pad(titlePreview(r), TITLE_W - 2)}
                    {"  "}
                    {r.done === 0 ? formatDate(r.next_show) : ""}
                  </Text>
                </Box>
              </React.Fragment>
            );
          })}
        </>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && selectedReminder != null && (
        <Box marginTop={1}>
          <Text>Delete "{titlePreview(selectedReminder)}"? Press </Text>
          <Text bold>d</Text>
          <Text> again to confirm, any other key to cancel.</Text>
        </Box>
      )}

      {/* Footer hints */}
      <Box marginTop={1}>
        <Text dimColor>↑↓ navigate · Enter view · d delete · a toggle archived · q quit</Text>
      </Box>
    </Box>
  );
}

interface DetailScreenProps {
  reminder: Reminder | null;
  selectedAction: number;
  deleteConfirm: boolean;
}

function DetailScreen({ reminder, selectedAction, deleteConfirm }: DetailScreenProps) {
  if (reminder == null) {
    return (
      <Box padding={1}>
        <Text>Reminder not found.</Text>
      </Box>
    );
  }

  const isArchived = reminder.done === 1;
  const bodyLines = wrapText(reminder.body, 50);

  const typeDisplay = reminder.type === "once" ? "One-time" : `Recurring — ${reminder.schedule}`;

  const dueDisplay = reminder.done === 0 ? formatDate(reminder.next_show) : "—";
  const statusDisplay = isArchived ? "Done" : "Active";

  const BOX_W = 46;
  const innerW = BOX_W - 4; // 2 spaces each side

  function line(content: string) {
    const padded =
      content.length < innerW
        ? content + " ".repeat(innerW - content.length)
        : content.slice(0, innerW);
    return `  ${padded}  `;
  }

  const blankLine = `  ${" ".repeat(innerW)}  `;

  return (
    <Box flexDirection="column" paddingTop={1} paddingLeft={2}>
      <Text>{"╭─ Reminder " + "─".repeat(BOX_W - 12) + "╮"}</Text>
      <Text>{`│${blankLine}│`}</Text>

      {reminder.title != null && <Text>{`│${line("  Title:  " + reminder.title)}│`}</Text>}

      {/* Body lines */}
      {bodyLines.map((bl, i) => (
        <Text key={i}>{`│${line(i === 0 ? "  Body:   " + bl : "           " + bl)}│`}</Text>
      ))}

      <Text>{`│${line("  Type:   " + typeDisplay)}│`}</Text>
      <Text>{`│${line("  Due:    " + dueDisplay)}│`}</Text>
      <Text>{`│${line("  Status: " + statusDisplay)}│`}</Text>
      <Text>{`│${blankLine}│`}</Text>

      {/* Actions row */}
      {!isArchived ? (
        <>
          <Text>
            {"│"}
            {"  "}
            {selectedAction === 0 ? (
              <Text bold underline>
                {"[Delete]"}
              </Text>
            ) : (
              <Text dimColor>{"[Delete]"}</Text>
            )}
            {"  "}
            {selectedAction === 1 ? (
              <Text bold underline>
                {"[Back]"}
              </Text>
            ) : (
              <Text dimColor>{"[Back]"}</Text>
            )}
            {" ".repeat(innerW - 18)}
            {"  │"}
          </Text>
        </>
      ) : (
        <Text>
          {"│"}
          {"  "}
          {selectedAction === 1 ? (
            <Text bold underline>
              {"[Back]"}
            </Text>
          ) : (
            <Text dimColor>{"[Back]"}</Text>
          )}
          {" ".repeat(innerW - 8)}
          {"  │"}
        </Text>
      )}

      <Text>{`│${blankLine}│`}</Text>
      <Text>{"╰" + "─".repeat(BOX_W) + "╯"}</Text>

      {/* Delete confirmation */}
      {deleteConfirm && (
        <Box marginTop={1}>
          <Text>Delete this reminder? Press </Text>
          <Text bold>Enter</Text>
          <Text> again to confirm, any other key to cancel.</Text>
        </Box>
      )}

      {/* Hint */}
      <Box marginTop={1}>
        <Text dimColor>
          {isArchived ? "Esc/b back" : "← → navigate · Enter select · Esc/b back"}
        </Text>
      </Box>
    </Box>
  );
}
