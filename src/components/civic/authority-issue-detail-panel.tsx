"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  X,
  MapPin,
  UserCheck,
  FileText,
  Layers,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import { formatRelativeTime, categoryLabel } from "@/lib/utils";
import { categoryToDepartment } from "@/lib/departments";
import { Separator } from "@/components/ui/separator";
import { IssueStatusBadge } from "./issue-status-badge";
import { PriorityBadge } from "./priority-badge";
import { AttentionBadge } from "./attention-badge";
import { CommunityImpactMeter } from "./community-impact-meter";
import { IssueLocationMap } from "./issue-location-map";
import { IssueTimeline } from "./issue-timeline";
import { RequestStatePanel } from "./request-officer-dialog";
import { AssignmentRequestActions } from "./assignment-request-actions";
import { StatusUpdateForm } from "./status-update-form";
import type {
  Category,
  Department,
  IssueStatus,
  Priority,
} from "@/generated/prisma/client";

// Same transition map the full issue page uses.
const ALLOWED_NEXT: Partial<Record<IssueStatus, IssueStatus[]>> = {
  ASSIGNED: ["IN_PROGRESS"],
  IN_PROGRESS: ["RESOLVED"],
  REOPENED: ["IN_PROGRESS"],
};

type DetailIssue = {
  id: string;
  title: string;
  description: string | null;
  category: Category;
  status: IssueStatus;
  priority: Priority;
  communityImpactScore: number;
  affectedCitizenCount: number;
  address: string | null;
  wardNumber: number | null;
  municipalityName: string | null;
  districtName: string | null;
  provinceName: string | null;
  latitude: number | null;
  longitude: number | null;
  dueDate: string | null;
  updatedAt: string;
  requestedToId: string | null;
  requestedTo: { id: string; name: string } | null;
  assignedTo: { id: string; name: string } | null;
  rootIssue: { id: string; title: string } | null;
  reports: {
    id: string;
    title: string;
    images: string[];
    createdAt: string;
    user: { name: string | null } | null;
  }[];
  updates: {
    id: string;
    content: string;
    images: string[];
    statusChange: IssueStatus | null;
    createdAt: string;
    author: { name: string | null } | null;
  }[];
};

// Floating right-side detail panel — shows full issue detail + management actions
// in place on the dashboard map, so officers never navigate away. Re-fetches when
// the selected issue's `revision` (its updatedAt from the map data) changes, so it
// stays fresh after an assign / status / deadline action triggers router.refresh().
export function AuthorityIssueDetailPanel({
  issueId,
  revision,
  isHead,
  sectionDept,
  currentUserId,
  onClose,
}: {
  issueId: string;
  revision: string;
  isHead: boolean;
  sectionDept: Department | null;
  currentUserId?: string;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<DetailIssue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(`/api/issues/${issueId}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) setDetail(data.issue as DetailIssue);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [issueId, revision]);

  const allowedNext = detail ? ALLOWED_NEXT[detail.status] ?? [] : [];
  // Section head (of this category) or HEAD can run the request handshake.
  const canRequest =
    !!detail &&
    detail.status === "VERIFIED" &&
    (isHead || (!!sectionDept && sectionDept === categoryToDepartment(detail.category)));
  // The officer this issue was requested to can accept / decline.
  const canRespond =
    !!detail &&
    detail.status === "VERIFIED" &&
    !!currentUserId &&
    detail.requestedToId === currentUserId;

  const place = detail
    ? [
        detail.address,
        detail.wardNumber ? `Ward ${detail.wardNumber}` : null,
        detail.municipalityName,
        detail.districtName,
      ]
        .filter(Boolean)
        .join(" · ") || "Location not specified"
    : "";

  return (
    <aside className="absolute inset-x-3 bottom-3 top-3 z-40 flex flex-col overflow-hidden rounded-xl border border-nilo/15 bg-background/95 shadow-xl backdrop-blur sm:inset-x-auto sm:right-3 sm:w-[min(94vw,400px)]">
      {/* Header */}
      <div className="flex items-start gap-2 border-b border-border bg-nilo px-4 py-3 text-white">
        <div className="min-w-0 flex-1 space-y-1.5">
          {detail ? (
            <>
              <div className="flex flex-wrap items-center gap-1.5">
                <IssueStatusBadge status={detail.status} />
                <PriorityBadge priority={detail.priority} />
              </div>
              <h2 className="font-heading text-lg font-semibold leading-snug tracking-tight">
                {detail.title}
              </h2>
            </>
          ) : (
            <h2 className="font-heading text-lg font-semibold">Issue detail</h2>
          )}
        </div>
        <button
          onClick={onClose}
          className="shrink-0 rounded-md p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="grid h-40 place-items-center text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : error || !detail ? (
          <div className="space-y-3 p-4">
            <p className="text-sm text-muted-foreground">Couldn&apos;t load this issue.</p>
            <Link
              href={`/authority/issues/${issueId}`}
              className="inline-flex items-center gap-1 text-sm font-medium text-simrik hover:underline"
            >
              Open full page <ArrowUpRight className="size-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-5 p-4">
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <MapPin className="mt-0.5 size-3.5 shrink-0" />
              {place}
            </p>

            {detail.description && (
              <p className="text-sm leading-relaxed text-foreground/85">{detail.description}</p>
            )}

            <CommunityImpactMeter
              score={detail.communityImpactScore}
              affectedCitizenCount={detail.affectedCitizenCount}
            />
            <AttentionBadge
              status={detail.status}
              updatedAt={detail.updatedAt}
              dueDate={detail.dueDate}
            />

            {detail.rootIssue && (
              <div className="flex items-center gap-2 rounded-lg bg-nilo/[0.06] px-3 py-2 text-sm ring-1 ring-nilo/10">
                <Layers className="size-4 shrink-0 text-nilo" />
                <span className="min-w-0 truncate">
                  Root issue: <span className="font-medium">{detail.rootIssue.title}</span>
                </span>
              </div>
            )}

            {detail.latitude != null && detail.longitude != null && (
              <IssueLocationMap
                latitude={detail.latitude}
                longitude={detail.longitude}
                address={detail.address}
              />
            )}

            {/* Manage */}
            <div className="space-y-4 rounded-xl border bg-card p-4">
              <h3 className="font-heading text-xs font-semibold uppercase tracking-[0.14em] text-nilo">
                Manage
              </h3>

              <div className="space-y-2">
                {detail.assignedTo ? (
                  <p className="flex items-center gap-1.5 text-sm">
                    <UserCheck className="size-4 text-muted-foreground" />
                    Assigned to <span className="font-medium">{detail.assignedTo.name}</span>
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Not yet assigned.</p>
                )}

                {/* The requested officer accepts / declines (commits the date). */}
                {canRespond && (
                  <AssignmentRequestActions issueId={detail.id} issueTitle={detail.title} />
                )}

                {/* Section head / HEAD requests an officer (or sees the pending request). */}
                {canRequest && !canRespond && (
                  <RequestStatePanel
                    issueId={detail.id}
                    issueTitle={detail.title}
                    issueCategory={detail.category}
                    requestedToName={detail.requestedTo?.name ?? null}
                  />
                )}
              </div>

              {allowedNext.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Update status</h4>
                    <StatusUpdateForm issueId={detail.id} allowedNextStatuses={allowedNext} />
                  </div>
                </>
              )}
            </div>

            {/* Attached reports */}
            <section className="space-y-2">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold tracking-tight">
                <FileText className="size-4" />
                Attached reports
                <span className="font-normal text-muted-foreground">({detail.reports.length})</span>
              </h3>
              {detail.reports.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reports attached.</p>
              ) : (
                <div className="space-y-2">
                  {detail.reports.map((report) => (
                    <div key={report.id} className="space-y-2 rounded-lg border bg-card p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-snug">{report.title}</p>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatRelativeTime(new Date(report.createdAt))}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        by {report.user?.name ?? "Anonymous"} · {categoryLabel(detail.category)}
                      </p>
                      {report.images.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {report.images.map((src) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={src}
                              src={src}
                              alt="Report evidence"
                              className="size-16 rounded-md border object-cover"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Timeline */}
            <section className="space-y-2">
              <h3 className="text-sm font-semibold tracking-tight">Timeline</h3>
              <IssueTimeline updates={detail.updates} />
            </section>

            <Link
              href={`/authority/issues/${detail.id}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Open full page <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
