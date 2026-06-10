"use server";

import { authActionClient } from "@/lib/safe-action";
import {
  createReportSchema,
  resolveReportSchema,
  type CreateReportInput,
} from "@/lib/validations/report";
import { prisma } from "@/lib/prisma";
import { analyzeReport } from "@/lib/ai/analyze-report";
import { Category, IssueStatus, Priority } from "@/generated/prisma/client";
import { computeImpact, haversineDistance, maxPriority } from "@/lib/utils";
import { detectCascadeLink } from "@/lib/causal-graph";
import type { ReportAIAnalysis, ClusterResult } from "@/types";

const GEO_RADIUS_METERS = 50;
const OPEN_STATUSES = [
  IssueStatus.SUBMITTED,
  IssueStatus.VERIFIED,
  IssueStatus.ASSIGNED,
  IssueStatus.IN_PROGRESS,
  IssueStatus.REOPENED,
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function attachReportToIssue(
  issueId: string,
  input: CreateReportInput,
  userId: string,
  aiResult: ReportAIAnalysis | null,
  outcome: "attached_geospatial" | "attached_semantic"
): Promise<ClusterResult> {
  const issue = await prisma.issue.findUniqueOrThrow({ where: { id: issueId } });

  const newCount = issue.reportCount + 1;
  const { score, priority: elevated } = computeImpact(newCount);
  // Arithmetic auto-elevation only — never demote a manually-set higher priority.
  const nextPriority = elevated
    ? maxPriority(issue.priority, elevated)
    : issue.priority;

  const [, report] = await prisma.$transaction([
    prisma.issue.update({
      where: { id: issueId },
      data: {
        reportCount: newCount,
        affectedCitizenCount: newCount,
        communityImpactScore: score,
        priority: nextPriority,
        confirmCount: { increment: 1 },
      },
    }),
    prisma.report.create({
      data: {
        title: input.title,
        description: input.description,
        category: input.category as Category,
        latitude: input.latitude,
        longitude: input.longitude,
        address: input.address,
        wardNumber: input.wardNumber,
        municipalityName: input.municipalityName,
        districtName: input.districtName,
        provinceName: input.provinceName,
        images: input.images,
        userId,
        issueId,
        aiAnalysis: (aiResult as object) ?? undefined,
        status: "ATTACHED",
      },
    }),
  ]);

  return {
    outcome,
    reportId: report.id,
    issueId,
    issueTitle: issue.title,
    reportCount: newCount,
    communityImpactScore: score,
    priority: nextPriority,
  };
}

async function createNewIssueFromReport(
  input: CreateReportInput,
  userId: string,
  aiResult: ReportAIAnalysis | null
): Promise<ClusterResult> {
  const category = (aiResult?.category ?? input.category) as Category;
  const priority = aiResult?.priority ?? Priority.MEDIUM;
  const storeRootCause =
    aiResult && aiResult.rootCauseConfidence > 0.65
      ? {
          aiRootCauseSuggestion: aiResult.rootCauseSuggestion,
          aiRootCauseReason: aiResult.rootCauseReason,
          aiRootCauseConfidence: aiResult.rootCauseConfidence,
        }
      : {};

  const issue = await prisma.issue.create({
    data: {
      title: input.title,
      description: input.description,
      category,
      priority,
      latitude: input.latitude,
      longitude: input.longitude,
      address: input.address,
      wardNumber: input.wardNumber,
      municipalityName: input.municipalityName,
      districtName: input.districtName,
      provinceName: input.provinceName,
      reportCount: 1,
      affectedCitizenCount: 1,
      communityImpactScore: 0.3,
      ...storeRootCause,
    },
  });

  const report = await prisma.report.create({
    data: {
      title: input.title,
      description: input.description,
      category,
      latitude: input.latitude,
      longitude: input.longitude,
      address: input.address,
      wardNumber: input.wardNumber,
      municipalityName: input.municipalityName,
      districtName: input.districtName,
      provinceName: input.provinceName,
      images: input.images,
      userId,
      issueId: issue.id,
      aiAnalysis: (aiResult as object) ?? undefined,
      status: "PROMOTED",
    },
  });

  // Cascade detection (STORY-010): is this new issue a downstream effect of an
  // existing nearby upstream issue? Best-effort — never blocks submission.
  await detectAndLinkCascade(issue);

  return {
    outcome: "created",
    reportId: report.id,
    issueId: issue.id,
    issueTitle: issue.title,
  };
}

// Looks for an upstream cause among nearby open issues and, if found, records a
// directed IssueChainLink and joins the new issue to that chain.
async function detectAndLinkCascade(issue: {
  id: string;
  category: Category;
  latitude: number;
  longitude: number;
  createdAt: Date;
  municipalityName: string | null;
}): Promise<void> {
  try {
    const candidates = await prisma.issue.findMany({
      where: {
        status: { in: OPEN_STATUSES },
        id: { not: issue.id },
        ...(issue.municipalityName
          ? { municipalityName: issue.municipalityName }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        category: true,
        latitude: true,
        longitude: true,
        createdAt: true,
        chainRootIssueId: true,
      },
    });

    const link = detectCascadeLink(issue, candidates);
    if (!link) return;

    await prisma.$transaction([
      prisma.issueChainLink.create({
        data: {
          upstreamIssueId: link.upstreamIssueId,
          downstreamIssueId: issue.id,
          confidence: link.confidence,
        },
      }),
      prisma.issue.update({
        where: { id: issue.id },
        data: { chainRootIssueId: link.chainRootIssueId },
      }),
    ]);
  } catch {
    // Detection is non-critical; a failure must not break report submission.
  }
}

// ─── Main clustering action ─────────────────────────────────────────────────
// Order (per civicchain.mdc):
//   1. Geospatial check FIRST  (haversine < 50m, same category, open status)
//   2. Semantic AI fallback    (>=0.80 attach, 0.50–0.79 ask, <0.50 new)
//   3. Community impact + arithmetic priority auto-elevation on attach
export const createReportAction = authActionClient
  .schema(createReportSchema)
  .action(async ({ parsedInput, ctx }): Promise<ClusterResult> => {
    const { user } = ctx;

    // ── Step 1: Geospatial clustering (primary) ──────────────────────────────
    const sameCategoryOpen = await prisma.issue.findMany({
      where: {
        status: { in: OPEN_STATUSES },
        category: parsedInput.category as Category,
        ...(parsedInput.municipalityName
          ? { municipalityName: parsedInput.municipalityName }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        latitude: true,
        longitude: true,
      },
    });

    const geoMatch = sameCategoryOpen
      .map((i) => ({
        issue: i,
        distance: haversineDistance(
          parsedInput.latitude,
          parsedInput.longitude,
          i.latitude,
          i.longitude
        ),
      }))
      .filter((c) => c.distance <= GEO_RADIUS_METERS)
      .sort((a, b) => a.distance - b.distance)[0];

    if (geoMatch) {
      return attachReportToIssue(
        geoMatch.issue.id,
        parsedInput,
        user.id,
        null,
        "attached_geospatial"
      );
    }

    // ── Step 2: Semantic similarity (AI fallback) ────────────────────────────
    const nearbyIssues = await prisma.issue.findMany({
      where: {
        status: { in: OPEN_STATUSES },
        ...(parsedInput.municipalityName
          ? { municipalityName: parsedInput.municipalityName }
          : {}),
      },
      take: 10,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        latitude: true,
        longitude: true,
      },
    });

    const aiResult = await analyzeReport(parsedInput, nearbyIssues);
    const sim = aiResult.duplicateConfidence;
    const dupId = aiResult.duplicateIssueId;
    const dupExists = dupId && nearbyIssues.some((i) => i.id === dupId);

    if (dupId && dupExists && sim >= 0.8) {
      return attachReportToIssue(
        dupId,
        parsedInput,
        user.id,
        aiResult,
        "attached_semantic"
      );
    }

    if (dupId && dupExists && sim >= 0.5) {
      // 0.50–0.79 → prompt the citizen, do NOT write anything yet.
      const candidate = await prisma.issue.findUniqueOrThrow({
        where: { id: dupId },
        select: {
          id: true,
          title: true,
          description: true,
          reportCount: true,
          communityImpactScore: true,
        },
      });
      return {
        outcome: "needs_decision",
        candidate,
        similarity: sim,
        reason: aiResult.duplicateReason,
      };
    }

    // ── Step 3: No match → create a new Issue ────────────────────────────────
    return createNewIssueFromReport(parsedInput, user.id, aiResult);
  });

// ─── Resolve a 0.50–0.79 citizen decision ─────────────────────────────────────
export const resolveReportDecisionAction = authActionClient
  .schema(resolveReportSchema)
  .action(async ({ parsedInput, ctx }): Promise<ClusterResult> => {
    const { user } = ctx;
    const { decision, attachIssueId, ...reportInput } = parsedInput;

    if (decision === "attach") {
      if (!attachIssueId) throw new Error("attachIssueId is required to attach");
      return attachReportToIssue(
        attachIssueId,
        reportInput,
        user.id,
        null,
        "attached_semantic"
      );
    }

    return createNewIssueFromReport(reportInput, user.id, null);
  });
