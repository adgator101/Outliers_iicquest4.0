import { IssueStatusBadge } from "./issue-status-badge";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { IssueStatus } from "@/generated/prisma/client";

export type TimelineEntry = {
  id: string;
  content: string;
  images: string[];
  statusChange: IssueStatus | null;
  createdAt: Date | string;
  author: { name: string | null } | null;
};

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return (
    name
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

// Map a status change to its brand token so a node's ring echoes the badge.
const STATUS_DOT: Record<IssueStatus, string> = {
  SUBMITTED: "bg-[var(--status-submitted)]",
  VERIFIED: "bg-[var(--status-verified)]",
  ASSIGNED: "bg-[var(--status-assigned)]",
  IN_PROGRESS: "bg-[var(--status-in-progress)]",
  RESOLVED: "bg-[var(--status-resolved)]",
  REOPENED: "bg-[var(--status-reopened)]",
};

export function IssueTimeline({ updates }: { updates: TimelineEntry[] }) {
  if (updates.length === 0) {
    return <p className="text-sm text-muted-foreground">No updates yet.</p>;
  }

  return (
    <ol className="relative space-y-6">
      {updates.map((u, i) => {
        const isStatus = u.statusChange != null;
        const isLast = i === updates.length - 1;
        return (
          <li key={u.id} className="relative flex gap-3.5">
            {/* connector line */}
            {!isLast && (
              <span className="absolute left-[17px] top-9 h-[calc(100%+0.5rem)] w-px bg-border" />
            )}
            {/* author / status node */}
            {isStatus ? (
              <span className="relative z-10 mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-background ring-1 ring-border">
                <span className={cn("size-3 rounded-full", STATUS_DOT[u.statusChange!])} />
              </span>
            ) : (
              <span className="relative z-10 mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-nilo/10 text-xs font-medium text-nilo">
                {initials(u.author?.name)}
              </span>
            )}

            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{u.author?.name ?? "System"}</span>
                {u.statusChange && <IssueStatusBadge status={u.statusChange} />}
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(new Date(u.createdAt))}
                </span>
              </div>
              {u.content && <p className="mt-1 text-sm text-foreground/90">{u.content}</p>}
              {u.images.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {u.images.map((src) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={src}
                      src={src}
                      alt="Evidence"
                      className="size-24 rounded-lg border object-cover"
                    />
                  ))}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
