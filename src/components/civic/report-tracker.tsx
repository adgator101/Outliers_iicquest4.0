import { Check, Circle, RotateCcw, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IssueStatus } from "@/generated/prisma/client";

function fmt(d: Date | string | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Lifecycle stepper built only from real timestamps (STORY-013). Steps without a
// timestamp render as pending — never guessed.
export function ReportTracker({
  status,
  createdAt,
  verifiedAt,
  assignedAt,
  inProgressAt,
  resolvedAt,
  dueDate,
  officerName,
}: {
  status: IssueStatus;
  createdAt: Date | string;
  verifiedAt: Date | string | null;
  assignedAt: Date | string | null;
  inProgressAt: Date | string | null;
  resolvedAt: Date | string | null;
  dueDate: Date | string | null;
  officerName: string | null;
}) {
  const steps = [
    { key: "reported", label: "Reported", date: createdAt as Date | string | null, done: true },
    { key: "verified", label: "Verified by community", date: verifiedAt, done: verifiedAt != null },
    {
      key: "assigned",
      label: officerName ? `Assigned to ${officerName}` : "Assigned to an officer",
      date: assignedAt,
      done: assignedAt != null,
    },
    { key: "in_progress", label: "Work in progress", date: inProgressAt, done: inProgressAt != null },
    { key: "resolved", label: "Resolved", date: resolvedAt, done: resolvedAt != null },
  ];

  const reopened = status === "REOPENED";

  return (
    <div className="space-y-4">
      <ol className="relative space-y-5 border-l border-border pl-6">
        {steps.map((s) => (
          <li key={s.key} className="relative">
            <span
              className={cn(
                "absolute -left-[31px] grid size-5 place-items-center rounded-full ring-4 ring-background",
                s.done ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
              )}
            >
              {s.done ? <Check className="size-3" /> : <Circle className="size-2.5" />}
            </span>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className={cn("text-sm font-medium", !s.done && "text-muted-foreground")}>
                {s.label}
              </p>
              {s.date ? (
                <span className="text-xs text-muted-foreground">{fmt(s.date)}</span>
              ) : (
                <span className="text-xs text-muted-foreground">Pending</span>
              )}
            </div>
          </li>
        ))}

        {reopened && (
          <li className="relative">
            <span className="absolute -left-[31px] grid size-5 place-items-center rounded-full bg-amber-500 text-white ring-4 ring-background">
              <RotateCcw className="size-3" />
            </span>
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
              Reopened — resolution disputed by the community
            </p>
          </li>
        )}
      </ol>

      {/* Committed completion — only if an official set one */}
      <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
        <CalendarClock className="size-4 shrink-0 text-muted-foreground" />
        {dueDate ? (
          <span>
            Committed completion: <span className="font-medium">{fmt(dueDate)}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">No committed completion date yet.</span>
        )}
      </div>
    </div>
  );
}
