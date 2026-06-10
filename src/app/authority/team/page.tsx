import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";
import { Card } from "@/components/ui/card";
import { Users2, ChevronRight } from "lucide-react";
import { AddEmployeeDialog } from "@/components/civic/add-employee-dialog";
import { EmployeeStatusToggle } from "@/components/civic/employee-status-toggle";
import { SectionHeadToggle } from "@/components/civic/section-head-toggle";
import { DepartmentBadge } from "@/components/civic/department-badge";
import { cn } from "@/lib/utils";

type Employee = {
  id: string;
  name: string;
  email: string;
  department: import("@/generated/prisma/client").Department | null;
  isActive: boolean;
  isSectionHead: boolean;
  wardNumber: number | null;
};

function initials(name: string) {
  return (
    name
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

// Group employees by ward. Numbered wards first (ascending), then a final
// "Municipality-wide" group for staff with no ward.
function groupByWard(employees: Employee[]) {
  const byWard = new Map<number | null, Employee[]>();
  for (const e of employees) {
    const key = e.wardNumber ?? null;
    const list = byWard.get(key) ?? [];
    list.push(e);
    byWard.set(key, list);
  }
  const wardKeys = [...byWard.keys()].filter((k): k is number => k !== null).sort((a, b) => a - b);
  const groups = wardKeys.map((ward) => ({
    key: `ward-${ward}`,
    label: `Ward ${ward}`,
    employees: byWard.get(ward)!,
  }));
  if (byWard.has(null)) {
    groups.push({
      key: "municipality-wide",
      label: "Municipality-wide",
      employees: byWard.get(null)!,
    });
  }
  return groups;
}

function EmployeeRow({ e }: { e: Employee }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-3 p-4",
        !e.isActive && "opacity-60"
      )}
    >
      <div className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-xs font-medium">
        {initials(e.name)}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium leading-snug">{e.name}</p>
        <p className="truncate text-xs text-muted-foreground">{e.email}</p>
      </div>

      {e.department ? (
        <DepartmentBadge department={e.department} />
      ) : (
        <span className="text-xs text-muted-foreground">No section</span>
      )}

      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-xs font-medium",
          e.isActive
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
            : "bg-muted text-muted-foreground"
        )}
      >
        {e.isActive ? "Active" : "Inactive"}
      </span>

      <SectionHeadToggle
        userId={e.id}
        isSectionHead={e.isSectionHead}
        hasDepartment={e.department != null}
      />
      <EmployeeStatusToggle userId={e.id} isActive={e.isActive} />
    </div>
  );
}

export default async function TeamPage() {
  const user = await requireRole([Role.LOCAL_BODY_HEAD]);

  const employees: Employee[] = await prisma.user.findMany({
    where: {
      role: Role.LOCAL_BODY_EMPLOYEE,
      municipalityName: user.municipalityName ?? undefined,
    },
    select: {
      id: true,
      name: true,
      email: true,
      department: true,
      isActive: true,
      isSectionHead: true,
      wardNumber: true,
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  const activeCount = employees.filter((e) => e.isActive).length;
  const wardCount = new Set(
    employees.filter((e) => e.isActive && e.wardNumber != null).map((e) => e.wardNumber)
  ).size;
  const groups = groupByWard(employees);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Users2 className="size-4 shrink-0" />
            {activeCount} active {activeCount === 1 ? "officer" : "officers"}
            {wardCount > 0
              ? ` across ${wardCount} ${wardCount === 1 ? "ward" : "wards"}`
              : ""}{" "}
            · {user.municipalityName ?? "Your municipality"}
          </p>
        </div>
        <AddEmployeeDialog />
      </div>

      {employees.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <div className="grid size-11 place-items-center rounded-full bg-muted">
            <Users2 className="size-5 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="font-medium">No staff yet</p>
            <p className="text-sm text-muted-foreground">
              Add your first team member to start assigning issues.
            </p>
          </div>
          <AddEmployeeDialog />
        </Card>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const activeInGroup = group.employees.filter((e) => e.isActive).length;
            return (
              <details
                key={group.key}
                open
                className="group overflow-hidden rounded-xl border bg-card"
              >
                <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
                  <span className="font-medium">{group.label}</span>
                  <span className="text-sm text-muted-foreground">
                    {activeInGroup} {activeInGroup === 1 ? "officer" : "officers"}
                    {group.employees.length !== activeInGroup
                      ? ` · ${group.employees.length - activeInGroup} inactive`
                      : ""}
                  </span>
                </summary>
                <div className="divide-y border-t">
                  {group.employees.map((e) => (
                    <EmployeeRow key={e.id} e={e} />
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
