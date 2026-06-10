import { prisma } from "@/lib/prisma";
import { needsAttention, daysSince, ATTENTION_THRESHOLD_DAYS } from "@/lib/utils";
import { IssueStatus, Prisma, Role } from "@/generated/prisma/client";
import type { CurrentUser } from "@/lib/session";

export const OPEN_STATUSES: IssueStatus[] = [
  IssueStatus.SUBMITTED,
  IssueStatus.VERIFIED,
  IssueStatus.ASSIGNED,
  IssueStatus.IN_PROGRESS,
  IssueStatus.REOPENED,
];

// Restrict a query to what a user is allowed to see.
// EXECUTIVE_BODY → no restriction (national). LOCAL_BODY_* → their municipality.
export function scopeForUser(user: CurrentUser | null): Prisma.IssueWhereInput {
  if (!user) return {};
  if (user.role === Role.LOCAL_BODY_EMPLOYEE || user.role === Role.LOCAL_BODY_HEAD) {
    return user.municipalityName ? { municipalityName: user.municipalityName } : {};
  }
  return {};
}

export async function getDashboardStats(where: Prisma.IssueWhereInput) {
  const grouped = await prisma.issue.groupBy({
    by: ["status"],
    where,
    _count: { _all: true },
  });

  const byStatus: Record<string, number> = {
    SUBMITTED: 0,
    VERIFIED: 0,
    ASSIGNED: 0,
    IN_PROGRESS: 0,
    RESOLVED: 0,
    REOPENED: 0,
  };
  for (const g of grouped) byStatus[g.status] = g._count._all;

  const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
  const open = total - byStatus.RESOLVED;

  const attention = await getAttentionIssues(where);

  return {
    total,
    open,
    byStatus,
    attentionCount: attention.length,
    resolved: byStatus.RESOLVED,
  };
}

export type AttentionIssue = Awaited<ReturnType<typeof getAttentionIssues>>[number];

// Open issues that have sat in their current status beyond the plain attention
// threshold. Factual age only — no SLA, no priority multiplier.
export async function getAttentionIssues(where: Prisma.IssueWhereInput) {
  const issues = await prisma.issue.findMany({
    where: { ...where, status: { in: OPEN_STATUSES } },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      municipalityName: true,
      wardNumber: true,
      category: true,
      reportCount: true,
      communityImpactScore: true,
      affectedCitizenCount: true,
      updatedAt: true,
      createdAt: true,
      dueDate: true,
      assignedTo: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: "asc" },
    take: 200,
  });

  return issues
    .map((i) => ({
      ...i,
      attention: needsAttention(i.status, i.updatedAt),
    }))
    .filter((i) => i.attention.flagged)
    .sort((a, b) => b.attention.daysInStatus - a.attention.daysInStatus);
}

// Issues carrying an AI root-cause suggestion above the 0.65 confidence
// threshold that have not yet been folded into a Root Issue.
export async function getRootCauseSuggestions(where: Prisma.IssueWhereInput) {
  return prisma.issue.findMany({
    where: {
      ...where,
      rootIssueId: null,
      aiRootCauseSuggestion: { not: null },
      aiRootCauseConfidence: { gt: 0.65 },
    },
    select: {
      id: true,
      title: true,
      category: true,
      status: true,
      priority: true,
      municipalityName: true,
      districtName: true,
      provinceName: true,
      wardNumber: true,
      latitude: true,
      longitude: true,
      aiRootCauseSuggestion: true,
      aiRootCauseReason: true,
      aiRootCauseConfidence: true,
      aiRootCauseRelatedIds: true,
      createdAt: true,
    },
    orderBy: { aiRootCauseConfidence: "desc" },
  });
}

// Per-employee performance — built entirely from factual durations, no targets or
// scores. Resolution time is measured ONLY over the assigned→resolved window, so an
// officer is never charged for time before the issue reached them.
export type EmployeePerformance = {
  open: number;
  resolved: number;
  avgResolutionDays: number | null;
  oldestOpenDays: number | null;
  pastThreshold: number; // open issues sitting past the ACTIVE attention threshold
};

export async function getEmployeePerformance(
  where: Prisma.IssueWhereInput
): Promise<Record<string, EmployeePerformance>> {
  const issues = await prisma.issue.findMany({
    where: { ...where, assignedToId: { not: null } },
    select: {
      assignedToId: true,
      status: true,
      assignedAt: true,
      resolvedAt: true,
      updatedAt: true,
    },
  });

  const acc: Record<
    string,
    { open: number; resolved: number; resSum: number; resN: number; oldestOpen: number; past: number }
  > = {};

  for (const i of issues) {
    const id = i.assignedToId!;
    const a =
      (acc[id] ??= { open: 0, resolved: 0, resSum: 0, resN: 0, oldestOpen: 0, past: 0 });

    if (i.status === IssueStatus.RESOLVED) {
      a.resolved++;
      if (i.assignedAt && i.resolvedAt) {
        const d =
          (new Date(i.resolvedAt).getTime() - new Date(i.assignedAt).getTime()) /
          86_400_000;
        if (d >= 0) {
          a.resSum += d;
          a.resN++;
        }
      }
    } else {
      a.open++;
      const age = daysSince(i.updatedAt);
      if (age > a.oldestOpen) a.oldestOpen = age;
      if (age > ATTENTION_THRESHOLD_DAYS.ACTIVE) a.past++;
    }
  }

  return Object.fromEntries(
    Object.entries(acc).map(([id, a]) => [
      id,
      {
        open: a.open,
        resolved: a.resolved,
        avgResolutionDays: a.resN ? Math.round(a.resSum / a.resN) : null,
        oldestOpenDays: a.open ? a.oldestOpen : null,
        pastThreshold: a.past,
      },
    ])
  );
}
