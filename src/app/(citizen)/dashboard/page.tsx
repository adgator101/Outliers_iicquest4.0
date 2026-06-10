import Link from "next/link";
import { MapPin, Plus } from "lucide-react";
import { requireRole } from "@/lib/session";
import { Role, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IssueStatusBadge } from "@/components/civic/issue-status-badge";
import { CommunityImpactMeter } from "@/components/civic/community-impact-meter";
import { WardIssuesFeed } from "@/components/civic/ward-issues-feed";
import { cn, formatRelativeTime } from "@/lib/utils";
const issueCardSelect = {
  id: true,
  title: true,
  category: true,
  status: true,
  priority: true,
  wardNumber: true,
  municipalityName: true,
  reportCount: true,
  communityImpactScore: true,
  affectedCitizenCount: true,
  createdAt: true,
  updatedAt: true,
  dueDate: true,
} satisfies Prisma.IssueSelect;

export default async function CitizenDashboardPage() {
  const user = await requireRole([Role.CITIZEN]);

  const [myReports, wardIssues] = await Promise.all([
    prisma.report.findMany({
      where: { userId: user.id },
      include: {
        issue: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            communityImpactScore: true,
            affectedCitizenCount: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.issue.findMany({
      where: {
        wardNumber: user.wardNumber ?? undefined,
        municipalityName: user.municipalityName ?? undefined,
      },
      orderBy: { communityImpactScore: "desc" },
      take: 30,
      select: issueCardSelect,
    }),
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome, {user.name}
          </h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="size-4 shrink-0" />
            {[
              user.municipalityName,
              user.wardNumber ? `Ward ${user.wardNumber}` : null,
            ]
              .filter(Boolean)
              .join(" · ") || "Your area"}
          </p>
        </div>
        <Link href="/report" className={cn(buttonVariants())}>
          <Plus className="size-4" />
          Report an Issue
        </Link>
      </div>

      {/* My reports */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">My Reports</h2>
        {myReports.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You haven&apos;t submitted any reports yet.{" "}
            <Link href="/report" className="font-medium text-primary underline">
              Report an issue
            </Link>
            .
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {myReports.map((report) =>
              report.issue ? (
                <Link
                  key={report.id}
                  href={`/issues/${report.issue.id}`}
                  className="block"
                >
                  <Card className="space-y-2 p-4 transition-colors hover:bg-muted/40">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate font-medium leading-snug">
                        {report.issue.title}
                      </p>
                      <IssueStatusBadge status={report.issue.status} />
                    </div>
                    <CommunityImpactMeter
                      score={report.issue.communityImpactScore}
                      affectedCitizenCount={report.issue.affectedCitizenCount}
                      compact
                    />
                    <p className="text-xs text-muted-foreground">
                      Reported {formatRelativeTime(new Date(report.createdAt))}
                    </p>
                  </Card>
                </Link>
              ) : (
                <Card key={report.id} className="space-y-1 p-4">
                  <p className="truncate font-medium leading-snug">
                    {report.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Reported {formatRelativeTime(new Date(report.createdAt))} ·
                    pending
                  </p>
                </Card>
              )
            )}
          </div>
        )}
      </section>

      {/* Ward issues */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">
          Issues in Your Ward
        </h2>
        <WardIssuesFeed
          initialIssues={wardIssues}
          ward={user.wardNumber}
          municipality={user.municipalityName}
        />
      </section>
    </div>
  );
}
