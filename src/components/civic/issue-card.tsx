import Link from "next/link";
import { MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { IssueStatusBadge } from "./issue-status-badge";
import { PriorityBadge } from "./priority-badge";
import { CommunityImpactMeter } from "./community-impact-meter";
import { AttentionBadge } from "./attention-badge";
import { categoryLabel, cn, formatRelativeTime, needsAttention } from "@/lib/utils";
import type { Category, IssueStatus, Priority } from "@/generated/prisma/client";

export type IssueCardData = {
  id: string;
  title: string;
  category: Category;
  status: IssueStatus;
  priority: Priority;
  wardNumber: number | null;
  municipalityName: string | null;
  reportCount: number;
  communityImpactScore: number;
  affectedCitizenCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  dueDate: Date | string | null;
};

export function IssueCard({
  issue,
  href,
}: {
  issue: IssueCardData;
  href: string;
}) {
  const { flagged } = needsAttention(issue.status, issue.updatedAt);

  return (
    <Link href={href} className="block">
      <Card
        className={cn(
          "p-4 transition-colors hover:bg-muted/40",
          flagged && "border-l-2 border-l-simrik"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="truncate font-medium leading-snug">{issue.title}</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3" />
              {issue.municipalityName ?? "Unknown"}
              {issue.wardNumber ? ` · Ward ${issue.wardNumber}` : ""} ·{" "}
              {categoryLabel(issue.category)}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <IssueStatusBadge status={issue.status} />
            <AttentionBadge
              status={issue.status}
              updatedAt={issue.updatedAt}
              dueDate={issue.dueDate}
            />
          </div>
        </div>

        <div className="mt-3">
          <CommunityImpactMeter
            score={issue.communityImpactScore}
            affectedCitizenCount={issue.affectedCitizenCount}
          />
        </div>

        <div className="mt-3 flex items-center justify-between">
          <PriorityBadge priority={issue.priority} />
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(new Date(issue.createdAt))}
          </span>
        </div>
      </Card>
    </Link>
  );
}
