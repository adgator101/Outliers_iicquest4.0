import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Layers, UserCheck, FileText } from "lucide-react";
import { requireRole } from "@/lib/session";
import { Role, IssueStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { formatRelativeTime } from "@/lib/utils";
import { categoryToDepartment } from "@/lib/departments";
import { getDownstreamOpenIssues } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { IssueStatusBadge } from "@/components/civic/issue-status-badge";
import { PriorityBadge } from "@/components/civic/priority-badge";
import { CommunityImpactMeter } from "@/components/civic/community-impact-meter";
import { AttentionBadge } from "@/components/civic/attention-badge";
import { IssueLocationMap } from "@/components/civic/issue-location-map";
import { IssueTimeline } from "@/components/civic/issue-timeline";
import { AssignIssueDialog } from "@/components/civic/assign-issue-dialog";
import { StatusUpdateForm } from "@/components/civic/status-update-form";
import { DeadlineForm } from "@/components/civic/deadline-form";
import { CascadeResolveCard } from "@/components/civic/cascade-resolve-card";
import { CascadeLinkBanner } from "@/components/civic/cascade-link-banner";

const ALLOWED_NEXT: Partial<Record<IssueStatus, IssueStatus[]>> = {
  ASSIGNED: [IssueStatus.IN_PROGRESS],
  IN_PROGRESS: [IssueStatus.RESOLVED],
  REOPENED: [IssueStatus.IN_PROGRESS],
};

export default async function AuthorityIssueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole([Role.LOCAL_BODY_EMPLOYEE, Role.LOCAL_BODY_HEAD]);
  const isHead = user.role === Role.LOCAL_BODY_HEAD;

  // A section head can assign issues that belong to their section.
  const me = isHead
    ? null
    : await prisma.user.findUnique({
        where: { id: user.id },
        select: { isSectionHead: true, department: true },
      });

  const issue = await prisma.issue.findUnique({
    where: { id },
    include: {
      reports: {
        select: {
          id: true,
          title: true,
          images: true,
          createdAt: true,
          user: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      updates: {
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
      assignedTo: { select: { id: true, name: true } },
      rootIssue: { select: { id: true, title: true } },
      downstreamLinks: {
        select: {
          reason: true,
          source: true,
          confidence: true,
          upstreamIssue: { select: { id: true, title: true } },
        },
        take: 1,
      },
    },
  });

  if (!issue) notFound();

  // Local body roles are scoped to their own municipality.
  if (user.municipalityName && issue.municipalityName !== user.municipalityName) {
    notFound();
  }

  const allowedNext = ALLOWED_NEXT[issue.status] ?? [];
  const canAssign =
    issue.status === IssueStatus.VERIFIED &&
    (isHead ||
      (!!me?.isSectionHead &&
        me.department === categoryToDepartment(issue.category)));
  const cascadeLink = issue.downstreamLinks[0] ?? null;
  const downstreamOpen =
    issue.status === IssueStatus.RESOLVED
      ? await getDownstreamOpenIssues(issue.id)
      : [];
  const locationParts = [
    issue.wardNumber ? `Ward ${issue.wardNumber}` : null,
    issue.municipalityName,
    issue.districtName,
    issue.provinceName,
  ].filter(Boolean);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 space-y-6">
      <Link
        href="/authority/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Dashboard
      </Link>

      {/* Header */}
      <div className="space-y-2 border-l-2 border-simrik pl-4">
        <div className="flex flex-wrap items-center gap-2">
          <IssueStatusBadge status={issue.status} />
          <PriorityBadge priority={issue.priority} />
          <AttentionBadge
            status={issue.status}
            updatedAt={issue.updatedAt}
            dueDate={issue.dueDate}
          />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">{issue.title}</h1>
        {issue.description && (
          <p className="text-sm text-foreground/90">{issue.description}</p>
        )}
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="size-4 shrink-0" />
          {[issue.address, ...locationParts].filter(Boolean).join(" · ") ||
            "Location not specified"}
        </p>
      </div>

      {/* Impact */}
      <Card className="p-4">
        <CommunityImpactMeter
          score={issue.communityImpactScore}
          affectedCitizenCount={issue.affectedCitizenCount}
        />
      </Card>

      {/* Map */}
      {issue.latitude != null && issue.longitude != null && (
        <IssueLocationMap
          latitude={issue.latitude}
          longitude={issue.longitude}
          address={issue.address}
        />
      )}

      {/* Upstream cause banner */}
      {cascadeLink && (
        <CascadeLinkBanner
          upstream={cascadeLink.upstreamIssue}
          reason={cascadeLink.reason}
          source={cascadeLink.source}
          confidence={cascadeLink.confidence}
          downstreamIssueId={issue.id}
          canRemove={isHead}
          hrefBase="/authority/issues"
        />
      )}

      {/* Cascade resolve — RESOLVED upstream with open downstream */}
      {downstreamOpen.length > 0 && (
        <CascadeResolveCard upstreamIssueId={issue.id} downstream={downstreamOpen} />
      )}

      {/* Root issue banner */}
      {issue.rootIssue && (
        <Card className="flex items-center gap-2 border-l-4 border-nilo p-4 text-sm">
          <Layers className="size-4 shrink-0 text-nilo" />
          <span>
            Linked to root issue:{" "}
            <span className="font-medium">{issue.rootIssue.title}</span>
          </span>
        </Card>
      )}

      {/* Management */}
      <Card className="space-y-4 p-4">
        <h2 className="font-heading text-xs font-semibold uppercase tracking-[0.14em] text-nilo">
          Manage
        </h2>

        {/* Assignment */}
        <div className="space-y-2">
          {issue.assignedTo ? (
            <p className="flex items-center gap-1.5 text-sm">
              <UserCheck className="size-4 text-muted-foreground" />
              Assigned to <span className="font-medium">{issue.assignedTo.name}</span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Not yet assigned.</p>
          )}
          {canAssign && (
            <AssignIssueDialog
              issueId={issue.id}
              issueTitle={issue.title}
              issueCategory={issue.category}
            />
          )}
        </div>

        {isHead && (
          <>
            <Separator />
            <DeadlineForm issueId={issue.id} currentDueDate={issue.dueDate} />
          </>
        )}

        <Separator />

        {/* Status transitions */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Update status</h3>
          <StatusUpdateForm issueId={issue.id} allowedNextStatuses={allowedNext} />
        </div>
      </Card>

      {/* Attached reports */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <FileText className="size-4" />
          Attached Reports
          <span className="text-sm font-normal text-muted-foreground">
            ({issue.reports.length})
          </span>
        </h2>
        {issue.reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reports attached.</p>
        ) : (
          <div className="space-y-2">
            {issue.reports.map((report) => (
              <Card key={report.id} className="space-y-2 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium leading-snug">{report.title}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatRelativeTime(new Date(report.createdAt))}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  by {report.user?.name ?? "Anonymous"}
                </p>
                {report.images.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {report.images.map((src) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={src}
                        src={src}
                        alt="Report evidence"
                        className="size-20 rounded-md border object-cover"
                      />
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Timeline */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Timeline</h2>
        <IssueTimeline updates={issue.updates} />
      </section>
    </div>
  );
}
