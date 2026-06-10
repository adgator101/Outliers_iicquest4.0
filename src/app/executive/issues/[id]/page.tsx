import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Layers, Eye, FileText } from "lucide-react";
import { requireRole } from "@/lib/session";
import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { computeEscalation } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { IssueStatusBadge } from "@/components/civic/issue-status-badge";
import { PriorityBadge } from "@/components/civic/priority-badge";
import { CommunityImpactMeter } from "@/components/civic/community-impact-meter";
import { EscalationBadge } from "@/components/civic/escalation-badge";
import { IssueLocationMap } from "@/components/civic/issue-location-map";
import { IssueTimeline } from "@/components/civic/issue-timeline";

export default async function ExecutiveIssueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireRole([Role.EXECUTIVE_BODY]);

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
      assignedTo: { select: { name: true } },
      rootIssue: { select: { id: true, title: true } },
    },
  });

  if (!issue) notFound();

  const escalation = computeEscalation(
    issue.status,
    issue.priority,
    issue.updatedAt,
    issue.dueDate
  );
  const photos = issue.reports.flatMap((r) => r.images);
  const locationParts = [
    issue.wardNumber ? `Ward ${issue.wardNumber}` : null,
    issue.municipalityName,
    issue.districtName,
    issue.provinceName,
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <Link
        href="/executive/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        National Overview
      </Link>

      {/* Read-only banner */}
      <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300">
        <Eye className="size-4 shrink-0" />
        National oversight view — read only
      </div>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <IssueStatusBadge status={issue.status} />
          <PriorityBadge priority={issue.priority} />
          {escalation.isEscalated && (
            <EscalationBadge
              status={issue.status}
              priority={issue.priority}
              updatedAt={issue.updatedAt}
              dueDate={issue.dueDate}
            />
          )}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{issue.title}</h1>
        {issue.description && (
          <p className="text-sm text-foreground/90">{issue.description}</p>
        )}
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="size-4 shrink-0" />
          {[issue.address, ...locationParts].filter(Boolean).join(" · ") ||
            "Location not specified"}
        </p>
        {issue.assignedTo && (
          <p className="text-sm text-muted-foreground">
            Assigned to: <span className="font-medium">{issue.assignedTo.name}</span>
          </p>
        )}
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

      {/* Root issue banner */}
      {issue.rootIssue && (
        <Card className="flex items-center gap-2 border-l-4 border-violet-500 p-4 text-sm">
          <Layers className="size-4 shrink-0 text-violet-600" />
          <span>
            Linked to root issue:{" "}
            <span className="font-medium">{issue.rootIssue.title}</span>
          </span>
        </Card>
      )}

      {/* Photos */}
      {photos.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Photos</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {photos.map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={src}
                src={src}
                alt="Reported issue"
                className="aspect-square w-full rounded-lg border object-cover"
              />
            ))}
          </div>
        </section>
      )}

      {/* Attached reports count */}
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <FileText className="size-4" />
        {issue.reports.length} attached{" "}
        {issue.reports.length === 1 ? "report" : "reports"}
      </p>

      {/* Timeline */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Timeline</h2>
        <IssueTimeline updates={issue.updates} />
      </section>
    </div>
  );
}
