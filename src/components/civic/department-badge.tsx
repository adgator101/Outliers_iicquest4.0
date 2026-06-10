import { Building } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEPARTMENT_BADGE_CLASSES,
  DEPARTMENT_SHORT_LABELS,
  DEPARTMENT_LABELS,
} from "@/lib/departments";
import type { Department } from "@/generated/prisma/client";

// Section badge with a stable per-section colour. Reused by the team roster and
// the assignment picker so an officer's section reads the same everywhere.
export function DepartmentBadge({
  department,
  full = false,
  className,
}: {
  department: Department;
  full?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        DEPARTMENT_BADGE_CLASSES[department],
        className
      )}
    >
      <Building className="size-3" />
      {full ? DEPARTMENT_LABELS[department] : DEPARTMENT_SHORT_LABELS[department]}
    </span>
  );
}
