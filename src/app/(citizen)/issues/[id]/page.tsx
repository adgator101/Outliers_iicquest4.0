import Link from "next/link";
import { type ReactNode } from "react";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Layers,
  Users,
  CalendarDays,
  CalendarCheck,
  Megaphone,
  CheckCircle2,
  UserCheck,
  Wrench,
  RotateCcw,
} from "lucide-react";
import { requireRole } from "@/lib/session";
import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { categoryLabel, needsAttention } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { IssueStatusBadge } from "@/components/civic/issue-status-badge";
import { PriorityBadge } from "@/components/civic/priority-badge";
import { IssueLocationMap } from "@/components/civic/issue-location-map";
import { IssueTimeline } from "@/components/civic/issue-timeline";
import { VerifyIssueButtons } from "@/components/civic/verify-issue-buttons";
import { ResolutionReview } from "@/components/civic/resolution-review";
import { ReportTracker } from "@/components/civic/report-tracker";
import { OfficerContactCard } from "@/components/civic/officer-contact-card";
import { CascadeLinkBanner } from "@/components/civic/cascade-link-banner";

const VERIFIABLE_STATUSES = new Set(["SUBMITTED", "VERIFIED", "RESOLVED"]);

export default async function CitizenIssueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole([Role.CITIZEN]);

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
      rootIssue: { select: { id: true, title: true } },
      assignedTo: {
        select: { name: true, phone: true, department: true, wardNumber: true },
      },
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

  // Existence votes (SUBMITTED→VERIFIED) and resolution votes (RESOLVED→REOPENED)
  // are tallied separately (STORY-018).
  const verifyPhase = issue.status === "RESOLVED" ? "RESOLUTION" : "EXISTENCE";

  const myVerification =
    (
      await prisma.issueVerification.findUnique({
        where: {
          issueId_userId_phase: { issueId: id, userId: user.id, phase: verifyPhase },
        },
        select: { type: true },
      })
    )?.type ?? null;

  const verifications = await prisma.issueVerification.findMany({
    where: { issueId: id, phase: verifyPhase },
    select: {
      id: true,
      type: true,
      isLocal: true,
      proofImages: true,
      comment: true,
      createdAt: true,
      user: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const confirms = verifications.filter((v) => v.type === "CONFIRM");
  const disputes = verifications.filter((v) => v.type === "DISPUTE");
  const nearbyConfirms = confirms.filter((v) => v.isLocal).length;
  const photoConfirms = confirms.filter((v) => v.proofImages.length > 0).length;

  // The officer's resolution claim (latest RESOLVED update) — shown openly so the
  // community can judge the fix against real evidence (STORY-018b).
  const resolvedUpdate =
    issue.status === "RESOLVED"
      ? [...issue.updates].reverse().find((u) => u.statusChange === "RESOLVED") ?? null
      : null;

  // "Before" = the photos from the original report (oldest report that has images).
  // `issue.reports` is ordered newest-first, so scan from the end.
  const beforeImages =
    [...issue.reports].reverse().find((r) => r.images.length > 0)?.images ?? [];

  const inProgressAt =
    [...issue.updates].reverse().find((u) => u.statusChange === "IN_PROGRESS")?.createdAt ?? null;

  const photos = issue.reports.flatMap((r) => r.images);
  const cascadeLink = issue.downstreamLinks[0] ?? null;
  const attention = needsAttention(issue.status, issue.updatedAt);

  const place = [
    issue.address,
    issue.wardNumber ? `Ward ${issue.wardNumber}` : null,
    issue.municipalityName,
    issue.districtName,
  ].filter(Boolean).join(" · ") || "Location not specified";

  const fmtDate = (d: Date | string | null) =>
    d
      ? new Date(d).toLocaleDateString(undefined, {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : null;

  // Plain-language "what's happening now" — the at-a-glance answer for citizens,
  // especially on mobile, so they don't have to read the whole page.
  const officerName = issue.assignedTo?.name ?? null;
  const dueLabel = fmtDate(issue.dueDate);
  const STATUS_TONE: Record<string, string> = {
    SUBMITTED: "bg-status-submitted/10 text-status-submitted",
    VERIFIED: "bg-status-verified/10 text-status-verified",
    ASSIGNED: "bg-status-assigned/10 text-status-assigned",
    IN_PROGRESS: "bg-status-in-progress/10 text-status-in-progress",
    RESOLVED: "bg-status-resolved/10 text-status-resolved",
    REOPENED: "bg-status-reopened/10 text-status-reopened",
  };
  const summary: { icon: ReactNode; headline: string; sub: string } = (() => {
    switch (issue.status) {
      case "SUBMITTED":
        return {
          icon: <Megaphone className="size-5" />,
          headline: "Waiting for community confirmation",
          sub: "Seen this problem? Confirm it below so it gets verified.",
        };
      case "VERIFIED":
        return {
          icon: <CheckCircle2 className="size-5" />,
          headline: "Confirmed by the community",
          sub: "Waiting for the municipality to assign an officer.",
        };
      case "ASSIGNED":
        return {
          icon: <UserCheck className="size-5" />,
          headline: officerName ? `Assigned to ${officerName}` : "Assigned to an officer",
          sub: dueLabel ? `Work starts soon · due ${dueLabel}` : "Work will start soon.",
        };
      case "IN_PROGRESS":
        return {
          icon: <Wrench className="size-5" />,
          headline: officerName ? `${officerName} is working on this` : "Work is underway",
          sub: dueLabel ? `Expected to finish by ${dueLabel}` : "Work is underway.",
        };
      case "RESOLVED":
        return {
          icon: <CheckCircle2 className="size-5" />,
          headline: "Marked resolved",
          sub: "Is it actually fixed? Confirm or dispute it below.",
        };
      default:
        return {
          icon: <RotateCcw className="size-5" />,
          headline: "Reopened",
          sub: "The community reported this isn't fixed yet.",
        };
    }
  })();

  return (
    <div className="w-full space-y-5">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to dashboard
      </Link>

      {/* ── Hero: nilo pennant band ─────────────────────────────────────────── */}
      <header className="pennant-clip bg-nilo px-5 py-6 text-white sm:px-8 sm:py-7">
        <div className="flex items-center gap-2">
          <IssueStatusBadge status={issue.status} />
          <PriorityBadge priority={issue.priority} />
          <span className="ml-auto select-all font-mono text-xs text-white/50">
            #{id.slice(-8).toUpperCase()}
          </span>
        </div>

        <h1 className="mt-3 font-heading text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
          {issue.title}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/70">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-4 shrink-0" />
            {place}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-4 shrink-0" />
            {issue.affectedCitizenCount} {issue.affectedCitizenCount === 1 ? "citizen" : "citizens"} affected
          </span>
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs">
            {categoryLabel(issue.category)}
          </span>
          {attention.flagged && (
            <span className="rounded-full bg-amber-400/20 px-2.5 py-0.5 text-xs text-amber-200">
              {attention.reason} {attention.daysInStatus}d
            </span>
          )}
        </div>
      </header>

      {/* ── What's happening now (plain language, mobile-first) ─────────────── */}
      <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
        <span className={`grid size-10 shrink-0 place-items-center rounded-full ${STATUS_TONE[issue.status]}`}>
          {summary.icon}
        </span>
        <div className="min-w-0">
          <p className="font-medium leading-snug">{summary.headline}</p>
          <p className="text-sm text-muted-foreground">{summary.sub}</p>
        </div>
      </div>

      {/* ── Context banners (full width, soft tints) ────────────────────────── */}
      {cascadeLink && (
        <CascadeLinkBanner
          upstream={cascadeLink.upstreamIssue}
          reason={cascadeLink.reason}
          source={cascadeLink.source}
          confidence={cascadeLink.confidence}
          downstreamIssueId={issue.id}
          canRemove={false}
          hrefBase="/issues"
        />
      )}
      {issue.rootIssue && (
        <div className="flex items-center gap-2 rounded-xl bg-nilo/[0.06] px-4 py-3 text-sm ring-1 ring-nilo/10">
          <Layers className="size-4 shrink-0 text-nilo" />
          <span>
            Part of a larger problem:{" "}
            <span className="font-medium">{issue.rootIssue.title}</span>
          </span>
        </div>
      )}

      {/* ── Two-column workspace ────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* MAIN SPINE */}
        <div className="space-y-6 lg:col-span-2">
          {issue.description && (
            <p className="text-[15px] leading-relaxed text-foreground/80">
              {issue.description}
            </p>
          )}

          {/* Progress */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold tracking-tight">Progress</h2>
            <Card className="p-5">
              <ReportTracker
                status={issue.status}
                createdAt={issue.createdAt}
                verifiedAt={issue.verifiedAt}
                assignedAt={issue.assignedAt}
                inProgressAt={inProgressAt}
                resolvedAt={issue.resolvedAt}
                dueDate={issue.dueDate}
                officerName={issue.assignedTo?.name ?? null}
              />
            </Card>
          </section>

          {/* Community verification / resolution review */}
          {issue.status === "RESOLVED" ? (
            <section className="space-y-3">
              <h2 className="text-base font-semibold tracking-tight">Was this resolved?</h2>
              <Card className="p-5">
                <ResolutionReview
                  issueId={issue.id}
                  myVote={myVerification}
                  beforeImages={beforeImages}
                  officerEvidence={
                    resolvedUpdate
                      ? {
                          content: resolvedUpdate.content,
                          images: resolvedUpdate.images,
                          authorName: resolvedUpdate.author?.name ?? null,
                          at: resolvedUpdate.createdAt,
                        }
                      : null
                  }
                  votes={verifications.map((v) => ({
                    id: v.id,
                    type: v.type,
                    isLocal: v.isLocal,
                    comment: v.comment,
                    proofImages: v.proofImages,
                    createdAt: v.createdAt,
                    userName: v.user?.name ?? null,
                  }))}
                />
              </Card>
            </section>
          ) : (
            VERIFIABLE_STATUSES.has(issue.status) && (
              <section className="space-y-3">
                <h2 className="text-base font-semibold tracking-tight">Can you confirm this issue?</h2>
                <Card className="space-y-3 p-5">
                  <VerifyIssueButtons
                    issueId={issue.id}
                    initialConfirmCount={confirms.length}
                    initialDisputeCount={disputes.length}
                    myVerification={myVerification}
                    issueStatus={issue.status}
                  />
                  {confirms.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {confirms.length} {confirms.length === 1 ? "resident has" : "residents have"} confirmed this
                      {nearbyConfirms > 0 ? ` · ${nearbyConfirms} from this ward` : ""}
                      {photoConfirms > 0 ? ` · ${photoConfirms} with photo proof` : ""}
                    </p>
                  )}
                </Card>
              </section>
            )
          )}

          {/* Activity */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold tracking-tight">Activity</h2>
            <IssueTimeline updates={issue.updates} />
          </section>
        </div>

        {/* SIDEBAR — fills the right gutter */}
        <aside className="space-y-6">
          {/* Who's handling it */}
          {issue.assignedTo && (
            <OfficerContactCard
              name={issue.assignedTo.name}
              department={issue.assignedTo.department}
              wardNumber={issue.assignedTo.wardNumber}
              phone={issue.assignedTo.phone}
            />
          )}

          {/* Key dates */}
          <Card className="space-y-3 p-4">
            <h2 className="font-heading text-xs font-semibold uppercase tracking-[0.14em] text-nilo">
              Key dates
            </h2>
            <div className="flex items-center gap-2.5 text-sm">
              <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">Reported</span>
              <span className="ml-auto font-medium">{fmtDate(issue.createdAt)}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm">
              <CalendarCheck className="size-4 shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">Completing by</span>
              <span className="ml-auto font-medium">
                {fmtDate(issue.dueDate) ?? <span className="text-muted-foreground">Not set</span>}
              </span>
            </div>
          </Card>

          {/* Location */}
          {issue.latitude != null && issue.longitude != null && (
            <section className="space-y-3">
              <h2 className="text-base font-semibold tracking-tight">Location</h2>
              <IssueLocationMap
                latitude={issue.latitude}
                longitude={issue.longitude}
                address={issue.address}
              />
            </section>
          )}

          {/* Photos */}
          {photos.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-base font-semibold tracking-tight">Photos</h2>
              {/* Horizontal swipe strip on phones, grid on larger screens */}
              <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0">
                {photos.map((src) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={src}
                    src={src}
                    alt="Reported issue"
                    className="size-32 shrink-0 snap-start rounded-xl border object-cover sm:size-auto sm:aspect-square sm:w-full"
                  />
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
