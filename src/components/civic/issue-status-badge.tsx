import { Badge } from "@/components/ui/badge";
import { cn, statusLabel } from "@/lib/utils";
import type { IssueStatus } from "@/generated/prisma/client";

// Lifecycle colors come from the --status-* tokens in globals.css —
// the same source the map markers use.
const STATUS_STYLES: Record<IssueStatus, string> = {
  SUBMITTED: "bg-status-submitted/10 text-status-submitted",
  VERIFIED: "bg-status-verified/10 text-status-verified",
  ASSIGNED: "bg-status-assigned/10 text-status-assigned",
  IN_PROGRESS: "bg-status-in-progress/10 text-status-in-progress",
  RESOLVED: "bg-status-resolved/10 text-status-resolved",
  REOPENED: "bg-status-reopened/10 text-status-reopened",
};

export function IssueStatusBadge({
  status,
  className,
}: {
  status: IssueStatus;
  className?: string;
}) {
  return (
    <Badge className={cn("border-transparent", STATUS_STYLES[status], className)}>
      {statusLabel(status)}
    </Badge>
  );
}
