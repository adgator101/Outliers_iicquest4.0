import Link from "next/link";
import { requireRole } from "@/lib/session";
import { Role, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getDashboardStats,
  getAttentionIssues,
  getRootCauseSuggestions,
  getPendingChainAlerts,
  scopeForUser,
} from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { IssueCard } from "@/components/civic/issue-card";
import { IssueStatusBadge } from "@/components/civic/issue-status-badge";
import { PriorityBadge } from "@/components/civic/priority-badge";
import { VerifyButton } from "@/components/civic/verify-button";
import { RootCauseSuggestionCard } from "@/components/civic/root-cause-suggestion-card";
import { AssignIssueDialog } from "@/components/civic/assign-issue-dialog";
import { AttentionBadge } from "@/components/civic/attention-badge";
import {
  AuthorityIssueMap,
  type MapStat,
} from "@/components/civic/authority-issue-map";
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
  latitude: true,
  longitude: true,
  createdAt: true,
  updatedAt: true,
  dueDate: true,
} satisfies Prisma.IssueSelect;

export default async function AuthorityDashboardPage() {
  const user = await requireRole([Role.LOCAL_BODY_EMPLOYEE, Role.LOCAL_BODY_HEAD]);
  const isHead = user.role === Role.LOCAL_BODY_HEAD;
  const scope = scopeForUser(user);

  const me = isHead
    ? null
    : await prisma.user.findUnique({
        where: { id: user.id },
        select: { isSectionHead: true, department: true },
      });
  const sectionDept = me?.isSectionHead ? me.department : null;

  const [stats, attentionIssues, submittedIssues, allIssues, rootCauseSuggestions, sectionQueue, chainAlerts] =
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
        take: 100,
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
      isHead ? getPendingChainAlerts(scope) : Promise.resolve([]),
    ]);

  const headerTitle = isHead
    ? "Municipality Dashboard"
    : sectionDept
    ? `${DEPARTMENT_LABELS[sectionDept]} — Section`
    : "My Assigned Issues";
  const headerSubtitle =
    (sectionDept ? "Section head · " : "") +
    ([user.municipalityName, user.districtName, user.provinceName]
      .filter(Boolean)
      .join(" · ") || "Your jurisdiction");

  const statChips: MapStat[] = [
    { label: "Open", value: stats.open },
    { label: "Pending", value: stats.byStatus.SUBMITTED },
    { label: "Attention", value: stats.attentionCount, alert: true },
    { label: "Resolved", value: stats.byStatus.RESOLVED },
  ];

  return (
    <AuthorityIssueMap
      issues={allIssues}
      isHead={isHead}
      headerTitle={headerTitle}
      headerSubtitle={headerSubtitle}
      stats={statChips}
    >
      {/* Section assignment queue — section heads only */}
      {sectionDept && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-xs font-semibold uppercase tracking-[0.14em] text-nilo">
              Awaiting Assignment — {DEPARTMENT_LABELS[sectionDept]}
            </h2>
            <Badge variant="secondary">{sectionQueue.length}</Badge>
          </div>
          {sectionQueue.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing waiting. Verified issues for your section appear here.
            </p>
          ) : (
            <div className="space-y-2">
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

      {/* Root cause suggestions — HEAD only */}
      {isHead && rootCauseSuggestions.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-simrik" />
            <h2 className="font-heading text-xs font-semibold uppercase tracking-[0.14em] text-nilo">Root Cause Suggestions</h2>
            <Badge variant="secondary">{rootCauseSuggestions.length}</Badge>
          </div>
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
        </section>
      )}

      {/* Cascading complaints — HEAD only */}
      {isHead && chainAlerts.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-xs font-semibold uppercase tracking-[0.14em] text-nilo">Cascading Complaints</h2>
            <Badge variant="secondary">{chainAlerts.length}</Badge>
          </div>
          <div className="space-y-2">
            {chainAlerts.map((alert) => (
              <Link key={alert.root.id} href={`/authority/issues/${alert.root.id}`} className="block">
                <Card className="border-l-4 border-amber-500 p-3 transition-colors hover:bg-muted/40">
                  <p className="text-sm font-medium">
                    {alert.root.wardNumber ? `Ward ${alert.root.wardNumber} · ` : ""}
                    {alert.linkedCount} linked issues
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    Root: {alert.root.title} · fix once, clear the chain
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Verification queue — HEAD only */}
      {isHead && submittedIssues.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-xs font-semibold uppercase tracking-[0.14em] text-nilo">Needs Verification</h2>
            <Badge variant="secondary">{submittedIssues.length}</Badge>
          </div>
          <div className="space-y-2">
            {submittedIssues.map((issue) => (
              <div key={issue.id} className="space-y-2">
                <IssueCard issue={issue} href={`/authority/issues/${issue.id}`} />
                <div className="flex justify-end">
                  <VerifyButton issueId={issue.id} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Needs attention */}
      {attentionIssues.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-xs font-semibold uppercase tracking-[0.14em] text-nilo">Needs Attention</h2>
            <Badge variant="secondary">{attentionIssues.length}</Badge>
          </div>
          <div className="space-y-2">
            {attentionIssues.map((issue) => {
              const borderClass =
                issue.attention.daysInStatus > issue.attention.limit * 2
                  ? "border-l-4 border-red-500"
                  : "border-l-4 border-amber-500";
              return (
                <Link key={issue.id} href={`/authority/issues/${issue.id}`} className="block">
                  <Card className={cn("p-3 transition-colors hover:bg-muted/40", borderClass)}>
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
        </section>
      )}
    </AuthorityIssueMap>
  );
}
