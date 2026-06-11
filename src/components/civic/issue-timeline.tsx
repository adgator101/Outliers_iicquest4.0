import { CircleDot } from "lucide-react";
import { IssueStatusBadge } from "./issue-status-badge";
import { formatRelativeTime } from "@/lib/utils";
import type { IssueStatus } from "@/generated/prisma/client";

export type TimelineEntry = {
  id: string;
  content: string;
  images: string[];
  statusChange: IssueStatus | null;
  createdAt: Date | string;
  author: { name: string | null } | null;
};

export function IssueTimeline({ updates }: { updates: TimelineEntry[] }) {
  if (updates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No updates yet.</p>
    );
  }

  return (
    <ol className="relative space-y-6 border-l border-border pl-6">
      {updates.map((u) => (
        <li key={u.id} className="relative">
          <span className="absolute -left-[27px] top-1 grid size-4 place-items-center rounded-full bg-background">
            <CircleDot
              className={
                u.statusChange ? "size-4 text-simrik" : "size-4 text-muted-foreground"
              }
            />
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">
              {u.author?.name ?? "System"}
            </span>
            {u.statusChange && <IssueStatusBadge status={u.statusChange} />}
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(new Date(u.createdAt))}
            </span>
          </div>
          <p className="mt-1 text-sm text-foreground/90">{u.content}</p>
          {u.images.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {u.images.map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={src}
                  src={src}
                  alt="Evidence"
                  className="size-20 rounded-md border object-cover"
                />
              ))}
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
