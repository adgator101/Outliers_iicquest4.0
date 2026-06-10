import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { OPEN_STATUSES } from "@/lib/queries";
import { categoryToDepartment } from "@/lib/departments";
import { Role, Category, Department } from "@/generated/prisma/client";

// Returns LOCAL_BODY_EMPLOYEE users within the requesting authority's municipality,
// for the team roster and the assignment dropdown.
//
// Access: the municipal HEAD (sees all staff), or a section head (an employee
// flagged isSectionHead — sees only their own section's officers).
//
// By default only active employees are returned (the assignment pool). The team
// page passes ?includeInactive=1 to show deactivated staff as well.
//
// When ?category=<Category> is supplied (the assign dialog does this), each
// employee also gets `openIssueCount` (current open issues — context only, NOT a
// ranking signal) and `isRecommended` (their section owns this category). Results
// are sorted recommended-section-first, then by name — the assigner decides.
export async function GET(request: Request) {
  const user = await requireRole([Role.LOCAL_BODY_HEAD, Role.LOCAL_BODY_EMPLOYEE]);
  const sp = new URL(request.url).searchParams;
  const includeInactive = sp.get("includeInactive") === "1";

  // A non-head employee may only use this endpoint if they are a section head,
  // and then only their own section's officers are visible to them.
  let sectionScope: Department | null = null;
  if (user.role === Role.LOCAL_BODY_EMPLOYEE) {
    const me = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { isSectionHead: true, department: true },
    });
    if (!me.isSectionHead || !me.department) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    sectionScope = me.department;
  }

  const categoryParam = sp.get("category");
  const category =
    categoryParam && categoryParam in Category
      ? (categoryParam as Category)
      : null;
  const recommendedDepartment: Department | null = category
    ? categoryToDepartment(category)
    : null;

  const employees = await prisma.user.findMany({
    where: {
      role: Role.LOCAL_BODY_EMPLOYEE,
      municipalityName: user.municipalityName ?? undefined,
      ...(sectionScope ? { department: sectionScope } : {}),
      ...(includeInactive ? {} : { isActive: true }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      department: true,
      isActive: true,
      wardNumber: true,
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  // One grouped query for everyone's current open workload.
  const counts = await prisma.issue.groupBy({
    by: ["assignedToId"],
    where: {
      assignedToId: { in: employees.map((e) => e.id) },
      status: { in: OPEN_STATUSES },
    },
    _count: { _all: true },
  });
  const loadById = new Map(
    counts.map((c) => [c.assignedToId, c._count._all] as const)
  );

  const enriched = employees.map((e) => ({
    ...e,
    openIssueCount: loadById.get(e.id) ?? 0,
    isRecommended:
      recommendedDepartment != null && e.department === recommendedDepartment,
  }));

  // Recommended section first (a categorical fact), then neutral name order.
  // We deliberately do NOT sort by openIssueCount: a raw open-issue count is not
  // a measure of effort (5 trivial tickets != 1 major job), so ranking by it would
  // assert a workload judgment the data can't support. The count is returned as
  // context only — the HEAD weighs it and decides.
  enriched.sort((a, b) => {
    if (a.isRecommended !== b.isRecommended) return a.isRecommended ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return NextResponse.json({ employees: enriched, recommendedDepartment });
}
