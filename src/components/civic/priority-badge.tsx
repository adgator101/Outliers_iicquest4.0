import { Badge } from "@/components/ui/badge";
import { cn, priorityLabel } from "@/lib/utils";
import type { Priority } from "@/generated/prisma/client";

// Priority colors come from the --priority-* tokens in globals.css —
// the same source the map markers use.
const PRIORITY_STYLES: Record<Priority, string> = {
  LOW: "bg-priority-low/10 text-priority-low",
  MEDIUM: "bg-priority-medium/10 text-priority-medium",
  HIGH: "bg-priority-high/10 text-priority-high",
  CRITICAL: "bg-priority-critical/10 text-priority-critical",
};

export function PriorityBadge({
  priority,
  className,
}: {
  priority: Priority;
  className?: string;
}) {
  return (
    <Badge className={cn("border-transparent", PRIORITY_STYLES[priority], className)}>
      {priorityLabel(priority)}
    </Badge>
  );
}
