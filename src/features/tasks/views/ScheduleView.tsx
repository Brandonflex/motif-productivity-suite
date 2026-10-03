import { useMemo, useState } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@blinkdotnew/ui";
import { CalendarDays, GripVertical, TriangleAlert } from "lucide-react";
import { PriorityPill } from "@/components/ui/Pills";
import { useWorkspace } from "@/features/workspace/useWorkspace";
import { addDaysIso, formatMinutes, minutesToClock, todayIso } from "@/lib/dates";
import { planDay } from "@/lib/plan";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/workspace";

/**
 * Schedule (Motion's auto-scheduling, on a seven-day canvas).
 *
 * Each column is a day the planner has already sequenced inside the user's
 * working window, so the shape of the week is visible without opening anything.
 * Anything still undated waits in the rail and can be dragged onto a day — or
 * moved with the keyboard through the select next to it — which is the
 * drag-to-insert habit from Things and Todoist.
 */
const HORIZON_DAYS = 7;
const PX_PER_MINUTE = 0.9;
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DROP_FORMAT = "text/plain";

function dayHeading(day: string, today: string): string {
  if (day === today) return "Today";
  if (day === addDaysIso(today, 1)) return "Tomorrow";
  const date = new Date(`${day}T12:00:00.000Z`);
  return WEEKDAYS[date.getUTCDay()] ?? day;
}

export function ScheduleView({ tasks, onOpen }: { tasks: Task[]; onOpen: (task: Task) => void }) {
  const { settings, updateTask } = useWorkspace();
  const [dragOver, setDragOver] = useState("");

  const today = todayIso();
  const days = useMemo(() => Array.from({ length: HORIZON_DAYS }, (_, index) => addDaysIso(today, index)), [today]);

  const backlog = useMemo(
    () =>
      tasks
        .filter((task) => task.status !== "Completed" && !task.dueDate)
        .sort((a, b) => a.title.localeCompare(b.title)),
    [tasks],
  );

  const columns = useMemo(
    () =>
      days.map((day) => {
        const scheduled = tasks.filter((task) => {
          if (task.status === "Completed" || !task.dueDate) return false;
          if (task.dueDate === day) return true;
          // Carried-over work belongs to today, not to every future day.
          return day === today && task.dueDate < today;
        });
        return { day, ...planDay(scheduled, settings, new Date(`${day}T12:00:00.000Z`)) };
      }),
    [days, settings, tasks, today],
  );

  const schedule = (taskId: string, dueDate: string) => {
    updateTask(taskId, { dueDate, startDate: "" });
  };

  const onDrop = (day: string) => (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver("");
    const taskId = event.dataTransfer?.getData(DROP_FORMAT);
    if (taskId) schedule(taskId, day);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
            Next {HORIZON_DAYS} days
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {settings.workdayStart}–{settings.workdayEnd} · {formatMinutes(settings.capacityMinutesPerDay)} capacity a
            day
          </span>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {backlog.length === 0
              ? "Nothing is waiting for a date — every open task has a day."
              : `${backlog.length} task${backlog.length === 1 ? "" : "s"} waiting for a date. Drag one onto a day, or pick a day from its menu.`}
          </p>

          <ul className="flex flex-wrap gap-2">
            {backlog.map((task) => (
              <li
                key={task.id}
                className="flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs"
              >
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                <button
                  type="button"
                  draggable
                  onDragStart={(event) => event.dataTransfer?.setData(DROP_FORMAT, task.id)}
                  onClick={() => onOpen(task)}
                  className="max-w-[12rem] truncate font-medium text-foreground hover:underline"
                  aria-label={`Open “${task.title}”`}
                >
                  {task.title}
                </button>
                <label className="sr-only" htmlFor={`schedule-${task.id}`}>
                  Plan “{task.title}” for
                </label>
                <select
                  id={`schedule-${task.id}`}
                  value=""
                  onChange={(event) => event.target.value && schedule(task.id, event.target.value)}
                  aria-label={`Plan “${task.title}” for`}
                  className="rounded border border-input bg-transparent px-1 py-0.5 text-[11px] text-muted-foreground"
                >
                  <option value="">Move to…</option>
                  <option value={today}>Today</option>
                  <option value={addDaysIso(today, 1)}>Tomorrow</option>
                  <option value={addDaysIso(today, 3)}>In 3 days</option>
                  <option value={addDaysIso(today, 7)}>Next week</option>
                </select>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-3 overflow-x-auto lg:grid-cols-7">
        {columns.map(({ day, blocks, deferred, committedMinutes, capacityMinutes, over, windowStart, windowEnd }) => (
          <section
            key={day}
            role="group"
            aria-label={`${dayHeading(day, today)} ${day}, ${blocks.length} blocks`}
            className="min-w-[11rem]"
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(day);
            }}
            onDragLeave={() => setDragOver((current) => (current === day ? "" : current))}
            onDrop={onDrop(day)}
          >
            <Card className={cn("flex h-full flex-col", dragOver === day && "border-primary/60 bg-primary/5")}>
              <CardHeader className="space-y-1 pb-2">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span>{dayHeading(day, today)}</span>
                  {over && <TriangleAlert className="h-3.5 w-3.5 text-warning" aria-label="Over capacity" />}
                </CardTitle>
                <p className="text-[11px] text-muted-foreground">
                  {formatMinutes(committedMinutes)} of {formatMinutes(capacityMinutes)}
                  {deferred.length > 0 ? ` · ${deferred.length} waiting` : ""}
                </p>
              </CardHeader>

              <CardContent className="flex-1 p-3">
                <div
                  className="relative rounded-md border border-border bg-muted/20"
                  style={{ height: (windowEnd - windowStart) * PX_PER_MINUTE }}
                >
                  {(windowEnd - windowStart) / 60 > 0 &&
                    Array.from(
                      { length: Math.floor((windowEnd - windowStart) / 60) + 1 },
                      (_, index) => index * 60,
                    ).map((offset) =>
                      offset > 0 && offset < windowEnd - windowStart ? (
                        <span
                          key={offset}
                          aria-hidden="true"
                          className="absolute inset-x-0 border-t border-dashed border-border/70"
                          style={{ top: offset * PX_PER_MINUTE }}
                        />
                      ) : null,
                    )}

                  {blocks.map((block) => (
                    <button
                      type="button"
                      key={block.task.id}
                      onClick={() => onOpen(block.task)}
                      className={cn(
                        "absolute inset-x-0.5 overflow-hidden rounded border px-1.5 py-1 text-left",
                        block.pinned ? "border-primary/60 bg-primary/15" : "border-primary/30 bg-primary/10",
                      )}
                      style={{
                        top: (block.startMinute - windowStart) * PX_PER_MINUTE,
                        height: Math.max(24, block.minutes * PX_PER_MINUTE - 2),
                      }}
                      aria-label={`${block.task.title}, ${minutesToClock(block.startMinute)} to ${minutesToClock(block.startMinute + block.minutes)}`}
                    >
                      <span className="block truncate text-[11px] font-medium text-foreground">{block.task.title}</span>
                      <span className="block text-[10px] tabular-nums text-muted-foreground">
                        {minutesToClock(block.startMinute)} · {formatMinutes(block.minutes)}
                      </span>
                    </button>
                  ))}
                </div>

                {deferred.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {deferred.map((task) => (
                      <li key={task.id}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-full justify-start gap-1.5 px-1.5 text-[11px]"
                          onClick={() => onOpen(task)}
                        >
                          <PriorityPill priority={task.priority} />
                          <span className="truncate">{task.title}</span>
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}

                {blocks.length === 0 && deferred.length === 0 && (
                  <p className="mt-2 text-center text-[11px] text-muted-foreground">Free</p>
                )}
              </CardContent>
            </Card>
          </section>
        ))}
      </div>
    </div>
  );
}
