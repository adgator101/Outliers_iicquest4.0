import Link from "next/link";
import { requireRole } from "@/lib/session";
import { Role, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getDashboardStats,
  getEscalatedIssues,
  scopeForUser,
} from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";
import { IssueCard } from "@/components/civic/issue-card";
import { IssueStatusBadge } from "@/components/civic/issue-status-badge";
import { PriorityBadge } from "@/components/civic/priority-badge";
import { EscalationBadge } from "@/components/civic/escalation-badge";
import { VerifyButton } from "@/components/civic/verify-button";
import { AuthorityIssueList } from "@/components/civic/authority-issue-list";
import { cn } from "@/lib/utils";

const issueCardSelect = {
  id: true,
  title: true,
  category: true,
  status: true,
  priority: true,
  reportCount: true,
  communityImpactScore: true,
  affectedCitizenCount: true,
  wardNumber: true,
  municipalityName: true,
  createdAt: true,
  updatedAt: true,
  dueDate: true,
} satisfies Prisma.IssueSelect;

export default async function AuthorityDashboardPage() {
  const user = await requireRole([Role.LOCAL_BODY_EMPLOYEE, Role.LOCAL_BODY_HEAD]);
  const isHead = user.role === Role.LOCAL_BODY_HEAD;
  const scope = scopeForUser(user);

  const [stats, escalations, submittedIssues, allIssues] = await Promise.all([
    getDashboardStats(scope),
    getEscalatedIssues(scope),
    isHead
      ? prisma.issue.findMany({
          where: { ...scope, status: "SUBMITTED" },
          orderBy: { communityImpactScore: "desc" },
          take: 20,
          select: issueCardSelect,
        })
      : Promise.resolve([]),
    prisma.issue.findMany({
      where: isHead ? scope : { ...scope, assignedToId: user.id },
      orderBy: [{ communityImpactScore: "desc" }, { createdAt: "desc" }],
      take: 50,
      select: issueCardSelect,
    }),
  ]);

  const statCards = [
    { label: "Open Issues", value: stats.open },
    { label: "Pending Verification", value: stats.byStatus.SUBMITTED },
    { label: "Escalated", value: stats.escalatedCount },
    { label: "Resolved", value: stats.byStatus.RESOLVED },
  ];

  return (
    <>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {isHead ? "Municipality Dashboard" : "My Assigned Issues"}
        </h1>
        <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          <Building2 className="size-4 shrink-0" />
          {[user.municipalityName, user.districtName, user.provinceName]
            .filter(Boolean)
            .join(" · ") || "Your jurisdiction"}
        </p>
      </div>

      {/* Stats strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-3xl font-bold tracking-tight">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Verification queue — HEAD only */}
      {isHead && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight">Needs Verification</h2>
            <Badge variant="secondary">{submittedIssues.length}</Badge>
          </div>
          {submittedIssues.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No issues pending verification.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {submittedIssues.map((issue) => (
                <div key={issue.id} className="space-y-2">
                  <IssueCard issue={issue} href={`/authority/issues/${issue.id}`} />
                  <div className="flex justify-end">
                    <VerifyButton issueId={issue.id} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Issue list */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">
          {isHead ? "All Issues" : "Assigned to Me"}
        </h2>
        <AuthorityIssueList
          initialIssues={allIssues}
          userId={user.id}
          municipalityName={user.municipalityName}
          isEmployee={!isHead}
        />
      </section>

      {/* Escalations */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold tracking-tight">Escalated Issues</h2>
          <Badge variant="secondary">{escalations.length}</Badge>
        </div>
        {escalations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No escalated issues — all within SLA.
          </p>
        ) : (
          <div className="space-y-2">
            {escalations.map((issue) => {
              const borderClass =
                issue.escalation.hoursOverdue > 168
                  ? "border-l-4 border-red-500"
                  : issue.escalation.hoursOverdue > 24
                  ? "border-l-4 border-amber-500"
                  : "border-l-4 border-border";
              return (
                <Link
                  key={issue.id}
                  href={`/authority/issues/${issue.id}`}
                  className="block"
                >
                  <Card
                    className={cn(
                      "p-3 transition-colors hover:bg-muted/40",
                      borderClass
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <PriorityBadge priority={issue.priority} />
                          <IssueStatusBadge status={issue.status} />
                        </div>
                        <p className="truncate font-medium">
                          {issue.title}
                          {issue.wardNumber ? ` — Ward ${issue.wardNumber}` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Assigned to: {issue.assignedTo?.name ?? "Unassigned"}
                        </p>
                      </div>
                      <div className="shrink-0">
                        <EscalationBadge
                          status={issue.status}
                          priority={issue.priority}
                          updatedAt={issue.updatedAt}
                          dueDate={issue.dueDate}
                        />
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
