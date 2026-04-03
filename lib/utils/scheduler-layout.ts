import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import type { SchedulerEvent } from "@/lib/entity/appointment";

dayjs.extend(isoWeek);

// ---------------------------------------------------------------------------
// Time slots
// ---------------------------------------------------------------------------

/**
 * Generate an array of "HH:mm" labels for the Y-axis of the scheduler.
 *
 * @example getTimeSlots(7, 21, 30) → ["07:00","07:30","08:00", …, "20:30"]
 */
export function getTimeSlots(
  startHour: number,
  endHour: number,
  intervalMinutes: number,
): string[] {
  const slots: string[] = [];
  let current = dayjs().startOf("day").hour(startHour);
  const end = dayjs().startOf("day").hour(endHour);

  while (current.isBefore(end)) {
    slots.push(current.format("HH:mm"));
    current = current.add(intervalMinutes, "minute");
  }

  return slots;
}

// ---------------------------------------------------------------------------
// Week days
// ---------------------------------------------------------------------------

/**
 * Return an array of 7 dates (Mon → Sun) that contain `referenceDate`.
 * Each entry is formatted as YYYY-MM-DD.
 */
export function getWeekDays(referenceDate: string): string[] {
  const ref = dayjs(referenceDate);
  const monday = ref.isoWeekday(1);
  return Array.from({ length: 7 }, (_, i) =>
    monday.add(i, "day").format("YYYY-MM-DD"),
  );
}

/**
 * Return an array of all dates in the month that contains `referenceDate`.
 */
export function getMonthDays(referenceDate: string): string[] {
  const ref = dayjs(referenceDate);
  const daysInMonth = ref.daysInMonth();
  const firstDay = ref.startOf("month");
  return Array.from({ length: daysInMonth }, (_, i) =>
    firstDay.add(i, "day").format("YYYY-MM-DD"),
  );
}

// ---------------------------------------------------------------------------
// Event position
// ---------------------------------------------------------------------------

/**
 * Calculate pixel `top` and `height` for an event inside the time-grid.
 *
 * @param time      "HH:mm"
 * @param duration  minutes
 * @param startHour first hour of the grid (e.g. 7)
 * @param slotHeight pixels per 30-min slot
 */
export function calcEventPosition(
  time: string,
  duration: number,
  startHour: number,
  slotHeight: number,
): { top: number; height: number } {
  const [h, m] = time.split(":").map(Number);
  const minutesFromStart = (h - startHour) * 60 + m;
  const pixelsPerMinute = slotHeight / 30;

  return {
    top: minutesFromStart * pixelsPerMinute,
    height: Math.max(duration * pixelsPerMinute, slotHeight * 0.5),
  };
}

// ---------------------------------------------------------------------------
// Overlap resolution
// ---------------------------------------------------------------------------

/**
 * Given a flat list of events for the **same day**, assign `column` and
 * `totalColumns` so overlapping events share horizontal space.
 *
 * Uses a classic sweep-line / greedy column assignment:
 *  1. Sort by `top` ascending, then by `height` descending.
 *  2. Walk events, assigning each to the first free column.
 *  3. After assignment, back-fill `totalColumns` for each overlap group.
 */
export function resolveOverlaps(events: SchedulerEvent[]): SchedulerEvent[] {
  if (events.length <= 1) {
    return events.map((e) => ({ ...e, column: 0, totalColumns: 1 }));
  }

  const sorted = [...events].sort(
    (a, b) => a.top - b.top || b.height - a.height,
  );

  // columns[i] = end-y of the last event placed in column i
  const columns: number[] = [];
  const assigned = sorted.map((ev) => {
    let col = columns.findIndex((endY) => endY <= ev.top);
    if (col === -1) {
      col = columns.length;
      columns.push(0);
    }
    columns[col] = ev.top + ev.height;
    return { ...ev, column: col, totalColumns: 1 };
  });

  // Build overlap groups and set totalColumns
  const groups: number[][] = [];
  for (let i = 0; i < assigned.length; i++) {
    const ev = assigned[i];
    const evEnd = ev.top + ev.height;

    let placed = false;
    for (const group of groups) {
      const overlaps = group.some((gi) => {
        const g = assigned[gi];
        return ev.top < g.top + g.height && evEnd > g.top;
      });
      if (overlaps) {
        group.push(i);
        placed = true;
        break;
      }
    }
    if (!placed) {
      groups.push([i]);
    }
  }

  for (const group of groups) {
    const maxCol = Math.max(...group.map((i) => assigned[i].column)) + 1;
    for (const i of group) {
      assigned[i].totalColumns = maxCol;
    }
  }

  return assigned;
}
