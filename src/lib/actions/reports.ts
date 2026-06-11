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
import { computeImpact, haversineDistance, maxPriority, daysSince } from "@/lib/utils";
import { detectCascadeWithAI } from "@/lib/ai/detect-cascade";
import type { ReportAIAnalysis, ClusterResult } from "@/types";

const GEO_RADIUS_METERS = 50;
const SEMANTIC_MERGE_RADIUS_METERS = 200; // AI auto-merge only within this range
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

  // Cascade detection (STORY-014): AI-driven causal chain detection.
  await detectAndLinkCascade(issue);

  return {
    outcome: "created",
    reportId: report.id,
    issueId: issue.id,
    issueTitle: issue.title,
  };
}

// Detects whether the new issue is a downstream causal effect of any nearby
// open issues. Uses Gemini for flexible chain reasoning (dam breach → flooding
// → garbage → mosquitoes etc.) with a simple same-category proximity fallback
// when the AI call fails. Best-effort — never blocks report submission.
async function detectAndLinkCascade(issue: {
  id: string;
  title: string;
  description: string;
  category: Category;
  latitude: number;
  longitude: number;
  createdAt: Date;
  municipalityName: string | null;
}): Promise<void> {
  const CASCADE_RADIUS_METERS = 500;
  const CASCADE_WINDOW_DAYS = 14;

  try {
    const candidates = await prisma.issue.findMany({
      where: {
        status: { in: OPEN_STATUSES },
        id: { not: issue.id },
        ...(issue.municipalityName ? { municipalityName: issue.municipalityName } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        category: true,
        latitude: true,
        longitude: true,
        createdAt: true,
        chainRootIssueId: true,
      },
    });

    // Pre-filter to the spatial + temporal window before calling AI.
    const nearby = candidates.filter((c) => {
      const dist = haversineDistance(issue.latitude, issue.longitude, c.latitude, c.longitude);
      const age = daysSince(c.createdAt);
      return dist <= CASCADE_RADIUS_METERS && age <= CASCADE_WINDOW_DAYS;
    });

    if (nearby.length === 0) return;

    const candidatesForAI = nearby.map((c) => ({
      id: c.id,
      title: c.title,
      category: c.category as string,
      distanceMeters: Math.round(
        haversineDistance(issue.latitude, issue.longitude, c.latitude, c.longitude)
      ),
      ageDays: Math.round(daysSince(c.createdAt)),
    }));

    // Primary: AI causal reasoning.
    let aiResult = await detectCascadeWithAI(
      { title: issue.title, description: issue.description, category: issue.category as string },
      candidatesForAI
    );
    let source = "ai";

    // Fallback: if AI returned nothing, use the closest same-category issue in range.
    if (!aiResult) {
      const sameCategory = nearby.filter((c) => c.category === issue.category);
      const closest = sameCategory.sort(
        (a, b) =>
          haversineDistance(issue.latitude, issue.longitude, a.latitude, a.longitude) -
          haversineDistance(issue.latitude, issue.longitude, b.latitude, b.longitude)
      )[0];
      if (closest) {
        source = "rule";
        aiResult = {
          upstreamIssueId: closest.id,
          reasoning: "Same category, within 500m and reported in the last 14 days.",
          confidence: 0.6,
        };
      }
    }

    if (!aiResult) return;

    const upstream = nearby.find((c) => c.id === aiResult!.upstreamIssueId);
    if (!upstream) return;

    const chainRootIssueId = upstream.chainRootIssueId ?? upstream.id;

    await prisma.$transaction([
      prisma.issueChainLink.create({
        data: {
          upstreamIssueId: aiResult.upstreamIssueId,
          downstreamIssueId: issue.id,
          confidence: aiResult.confidence,
          reason: aiResult.reasoning,
          source,
        },
      }),
      prisma.issue.update({
        where: { id: issue.id },
        data: { chainRootIssueId },
      }),
    ]);
  } catch {
    // Best-effort — never block report submission.
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

    // Guard: semantic auto-merge only fires if the matched issue is within
    // SEMANTIC_MERGE_RADIUS_METERS. Beyond that, even a high-confidence AI
    // match is a prompt, not a silent merge — 1.5km away is a different place.
    const matchedIssue = dupId ? nearbyIssues.find((i) => i.id === dupId) : null;
    const matchDistance =
      matchedIssue
        ? haversineDistance(
            parsedInput.latitude,
            parsedInput.longitude,
            matchedIssue.latitude,
            matchedIssue.longitude
          )
        : Infinity;
    const withinMergeRadius = matchDistance <= SEMANTIC_MERGE_RADIUS_METERS;

    if (dupId && dupExists && sim >= 0.8 && withinMergeRadius) {
      return attachReportToIssue(
        dupId,
        parsedInput,
        user.id,
        aiResult,
        "attached_semantic"
      );
    }

    // For ≥0.80 but outside merge radius, treat same as 0.50–0.79 — ask citizen.
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
