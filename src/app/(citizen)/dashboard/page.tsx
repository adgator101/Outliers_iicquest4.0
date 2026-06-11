import Link from "next/link";
import { MapPin, Plus } from "lucide-react";
import { requireRole } from "@/lib/session";
import { Role, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { buttonVariants } from "@/components/ui/button";
import { IssueStatusBadge } from "@/components/civic/issue-status-badge";
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

  const wardScope = {
    wardNumber: user.wardNumber ?? undefined,
    municipalityName: user.municipalityName ?? undefined,
  };

  const [myReports, wardIssues, myReportCount, openInWard, resolvedInWard] =
    await Promise.all([
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
        where: wardScope,
        orderBy: { communityImpactScore: "desc" },
        take: 30,
        select: issueCardSelect,
      }),
      prisma.report.count({ where: { userId: user.id } }),
      prisma.issue.count({
        where: { ...wardScope, status: { not: "RESOLVED" } },
      }),
      prisma.issue.count({
        where: { ...wardScope, status: "RESOLVED" },
      }),
    ]);

  const place =
    [user.municipalityName, user.wardNumber ? `Ward ${user.wardNumber}` : null]
      .filter(Boolean)
      .join(" · ") || "Your area";

  const stats = [
    { label: "My reports", value: myReportCount },
    { label: "Open in your ward", value: openInWard },
    { label: "Resolved in your ward", value: resolvedInWard },
  ];

  return (
    <div className="space-y-8">
      {/* Hero status strip */}
      <section className="pennant-clip bg-nilo px-6 py-7 text-white sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-white/60">
              <MapPin className="size-3.5" />
              {place}
            </p>
            <h1 className="mt-1.5 text-3xl font-semibold tracking-tight">
              Namaste, {user.name.split(" ")[0]}
            </h1>
          </div>
          <Link
            href="/report"
            className={cn(buttonVariants({ size: "lg" }), "shadow-sm")}
          >
            <Plus className="size-4" />
            Report an issue
          </Link>
        </div>

        <div className="mt-6 grid max-w-md grid-cols-3 gap-4 border-t border-white/15 pt-5">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="font-heading text-3xl font-semibold tabular-nums leading-none">
                {s.value}
              </p>
              <p className="mt-1.5 text-xs leading-snug text-white/60">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Two-column body */}
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* Ward feed */}
        <section className="min-w-0 space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">
            Issues in your ward
          </h2>
          <WardIssuesFeed
            initialIssues={wardIssues}
            ward={user.wardNumber}
            municipality={user.municipalityName}
          />
        </section>

        {/* My reports rail */}
        <aside className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">My reports</h2>
          {myReports.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
              You haven&apos;t submitted any reports yet.{" "}
              <Link
                href="/report"
                className="font-medium text-simrik underline underline-offset-4"
              >
                Report an issue
              </Link>{" "}
              to start tracking it here.
            </div>
          ) : (
            <div className="divide-y divide-border rounded-lg border border-border bg-card">
              {myReports.map((report) =>
                report.issue ? (
                  <Link
                    key={report.id}
                    href={`/issues/${report.issue.id}`}
                    className="block px-4 py-3 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 truncate text-sm font-medium leading-snug">
                        {report.issue.title}
                      </p>
                      <IssueStatusBadge status={report.issue.status} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {report.issue.affectedCitizenCount > 1
                        ? `${report.issue.affectedCitizenCount} citizens affected · `
                        : ""}
                      Reported {formatRelativeTime(new Date(report.createdAt))}
                    </p>
                  </Link>
                ) : (
                  <div key={report.id} className="px-4 py-3">
                    <p className="truncate text-sm font-medium leading-snug">
                      {report.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Reported {formatRelativeTime(new Date(report.createdAt))}{" "}
                      · pending
                    </p>
                  </div>
                )
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
