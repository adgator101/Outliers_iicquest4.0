import Link from "next/link";
import { requireRole } from "@/lib/session";
import { Role, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getDashboardStats,
  getAttentionIssues,
  getRootCauseSuggestions,
  scopeForUser,
} from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  FolderOpen,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { IssueCard } from "@/components/civic/issue-card";
import { IssueStatusBadge } from "@/components/civic/issue-status-badge";
import { PriorityBadge } from "@/components/civic/priority-badge";
import { VerifyButton } from "@/components/civic/verify-button";
import { AuthorityIssueList } from "@/components/civic/authority-issue-list";
import { RootCauseSuggestionCard } from "@/components/civic/root-cause-suggestion-card";
import { AssignIssueDialog } from "@/components/civic/assign-issue-dialog";
import { AttentionBadge } from "@/components/civic/attention-badge";
import { categoriesForDepartment, DEPARTMENT_LABELS } from "@/lib/departments";
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

  // Section heads (employees flagged isSectionHead) get a queue of verified issues
  // for their section to assign within their team.
  const me = isHead
    ? null
    : await prisma.user.findUnique({
        where: { id: user.id },
        select: { isSectionHead: true, department: true },
      });
  const sectionDept = me?.isSectionHead ? me.department : null;

  const [stats, attentionIssues, submittedIssues, allIssues, rootCauseSuggestions, sectionQueue] =
    await Promise.all([
      getDashboardStats(scope),
      getAttentionIssues(scope),
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
      isHead ? getRootCauseSuggestions(scope) : Promise.resolve([]),
      sectionDept
        ? prisma.issue.findMany({
            where: {
              ...scope,
              status: "VERIFIED",
              category: { in: categoriesForDepartment(sectionDept) },
            },
            orderBy: [{ communityImpactScore: "desc" }, { createdAt: "desc" }],
            take: 30,
            select: issueCardSelect,
          })
        : Promise.resolve([]),
    ]);

  const statCards = [
    {
      label: "Open Issues",
      value: stats.open,
      icon: FolderOpen,
      accent: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
    },
    {
      label: "Pending Verification",
      value: stats.byStatus.SUBMITTED,
      icon: Clock,
      accent: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    },
    {
      label: "Needs Attention",
      value: stats.attentionCount,
      icon: AlertTriangle,
      accent: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
      highlight: stats.attentionCount > 0,
    },
    {
      label: "Resolved",
      value: stats.byStatus.RESOLVED,
      icon: CheckCircle2,
      accent: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b pb-5">
        <h1 className="text-2xl font-semibold tracking-tight">
          {isHead
            ? "Municipality Dashboard"
            : sectionDept
            ? `${DEPARTMENT_LABELS[sectionDept]} — Section`
            : "My Assigned Issues"}
        </h1>
        <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          <Building2 className="size-4 shrink-0" />
          {sectionDept ? "Section head · " : ""}
          {[user.municipalityName, user.districtName, user.provinceName]
            .filter(Boolean)
            .join(" · ") || "Your jurisdiction"}
        </p>
      </div>

      {/* Stats strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card
            key={s.label}
            className={cn(
              s.highlight && "border-red-200 dark:border-red-900/60"
            )}
          >
            <CardContent className="flex items-center justify-between gap-3 pt-6">
              <div className="min-w-0">
                <p className="truncate text-sm text-muted-foreground">{s.label}</p>
                <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums">
                  {s.value}
                </p>
              </div>
              <div className={cn("grid size-10 shrink-0 place-items-center rounded-lg", s.accent)}>
                <s.icon className="size-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Section assignment queue — section heads only */}
      {sectionDept && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight">
              Awaiting Assignment — {DEPARTMENT_LABELS[sectionDept]}
            </h2>
            <Badge variant="secondary">{sectionQueue.length}</Badge>
          </div>
          {sectionQueue.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing waiting. Verified issues for your section appear here to assign.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {sectionQueue.map((issue) => (
                <div key={issue.id} className="space-y-2">
                  <IssueCard issue={issue} href={`/authority/issues/${issue.id}`} />
                  <div className="flex justify-end">
                    <AssignIssueDialog
                      issueId={issue.id}
                      issueTitle={issue.title}
                      issueCategory={issue.category}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Root cause suggestions — HEAD only, demo-critical */}
      {isHead && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-violet-600" />
            <h2 className="text-lg font-semibold tracking-tight">
              Root Cause Suggestions
            </h2>
            <Badge variant="secondary">{rootCauseSuggestions.length}</Badge>
          </div>
          {rootCauseSuggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No root cause suggestions at this time.
            </p>
          ) : (
            <div className="space-y-3">
              {rootCauseSuggestions.map((s) => (
                <RootCauseSuggestionCard
                  key={s.id}
                  issueId={s.id}
                  suggestion={s.aiRootCauseSuggestion ?? ""}
                  reason={s.aiRootCauseReason ?? ""}
                  confidence={s.aiRootCauseConfidence ?? 0}
                  relatedIds={s.aiRootCauseRelatedIds}
                  category={s.category}
                  municipalityName={s.municipalityName}
                  districtName={s.districtName}
                  provinceName={s.provinceName}
                />
              ))}
            </div>
          )}
        </section>
      )}

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
          isHead={isHead}
        />
      </section>

      {/* Needs attention */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold tracking-tight">Needs Attention</h2>
          <Badge variant="secondary">{attentionIssues.length}</Badge>
        </div>
        {attentionIssues.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing waiting too long — every open issue is within its attention window.
          </p>
        ) : (
          <div className="space-y-2">
            {attentionIssues.map((issue) => {
              const borderClass =
                issue.attention.daysInStatus > issue.attention.limit * 2
                  ? "border-l-4 border-red-500"
                  : "border-l-4 border-amber-500";
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
                        <AttentionBadge
                          status={issue.status}
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
    </div>
  );
}
