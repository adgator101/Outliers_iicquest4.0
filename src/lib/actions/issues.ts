"use server";

import { z } from "zod";
import { authActionClient, roleActionClient } from "@/lib/safe-action";
import {
  updateIssueStatusSchema,
  assignIssueSchema,
  verifyIssueSchema,
  createRootIssueSchema,
} from "@/lib/validations/issue";
import { prisma } from "@/lib/prisma";
import { categoryToDepartment } from "@/lib/departments";
import { haversineDistance } from "@/lib/utils";
import { IssueStatus, Role } from "@/generated/prisma/client";

// Valid status transitions
const ALLOWED_TRANSITIONS: Partial<Record<IssueStatus, IssueStatus[]>> = {
  SUBMITTED: [IssueStatus.VERIFIED],
  VERIFIED: [IssueStatus.ASSIGNED],
  ASSIGNED: [IssueStatus.IN_PROGRESS],
  IN_PROGRESS: [IssueStatus.RESOLVED],
  RESOLVED: [IssueStatus.REOPENED],
  REOPENED: [IssueStatus.IN_PROGRESS],
};

// Weighted community verification (STORY-012).
const VERIFY_THRESHOLD = 3.0; // weighted confirmations needed to VERIFY
const PROOF_RADIUS_METERS = 200; // geotagged proof must be this close to the issue
const PROOF_MULTIPLIER = 1.5;

export const verifyIssueAction = authActionClient
  .schema(verifyIssueSchema)
  .action(async ({ parsedInput, ctx }) => {
    const verifier = await prisma.user.findUniqueOrThrow({
      where: { id: String(ctx.user.id) },
      select: { wardNumber: true, municipalityName: true },
    });

    const issue = await prisma.issue.findUniqueOrThrow({
      where: { id: parsedInput.issueId },
      select: {
        status: true,
        wardNumber: true,
        municipalityName: true,
        latitude: true,
        longitude: true,
      },
    });

    // Locality gate: you can only verify issues in your own municipality.
    if (
      verifier.municipalityName &&
      issue.municipalityName &&
      verifier.municipalityName !== issue.municipalityName
    ) {
      throw new Error("You can only verify issues in your municipality.");
    }

    // Locality weight: same ward = full, same municipality = half.
    const isLocal =
      verifier.wardNumber != null && verifier.wardNumber === issue.wardNumber;
    const base = isLocal ? 1.0 : 0.5;

    // Proof weight: a geotagged photo within range of the issue boosts the weight.
    const proofVerified =
      parsedInput.proofImages.length > 0 &&
      parsedInput.proofLatitude != null &&
      parsedInput.proofLongitude != null &&
      haversineDistance(
        parsedInput.proofLatitude,
        parsedInput.proofLongitude,
        issue.latitude,
        issue.longitude
      ) <= PROOF_RADIUS_METERS;

    const weight = base * (proofVerified ? PROOF_MULTIPLIER : 1);

    // Upsert verification (one per user per issue)
    const verification = await prisma.issueVerification.upsert({
      where: { issueId_userId: { issueId: parsedInput.issueId, userId: String(ctx.user.id) } },
      create: {
        issueId: parsedInput.issueId,
        userId: String(ctx.user.id),
        type: parsedInput.type,
        weight,
        isLocal,
        proofImages: parsedInput.proofImages,
      },
      update: {
        type: parsedInput.type,
        weight,
        isLocal,
        proofImages: parsedInput.proofImages,
      },
    });

    // Recompute raw counts (display) and weighted sums (threshold logic).
    const all = await prisma.issueVerification.findMany({
      where: { issueId: parsedInput.issueId },
      select: { type: true, weight: true },
    });
    let confirmCount = 0;
    let disputeCount = 0;
    let confirmWeight = 0;
    let disputeWeight = 0;
    for (const v of all) {
      if (v.type === "CONFIRM") {
        confirmCount++;
        confirmWeight += v.weight;
      } else {
        disputeCount++;
        disputeWeight += v.weight;
      }
    }

    let newStatus = issue.status;

    // Auto-verify on weighted confirmations (not raw count).
    if (
      issue.status === IssueStatus.SUBMITTED &&
      confirmWeight - disputeWeight >= VERIFY_THRESHOLD
    ) {
      newStatus = IssueStatus.VERIFIED;
    }

    // Auto-reopen if weighted disputes exceed confirmations on a RESOLVED issue.
    if (issue.status === IssueStatus.RESOLVED && disputeWeight > confirmWeight) {
      newStatus = IssueStatus.REOPENED;
    }

    await prisma.issue.update({
      where: { id: parsedInput.issueId },
      data: {
        confirmCount,
        disputeCount,
        status: newStatus,
        ...(newStatus === IssueStatus.VERIFIED && issue.status === IssueStatus.SUBMITTED
          ? { verifiedAt: new Date() }
          : {}),
      },
    });

    return { verification, confirmCount, disputeCount, newStatus, proofVerified };
  });

export const updateIssueStatusAction = roleActionClient([
  Role.LOCAL_BODY_EMPLOYEE,
  Role.LOCAL_BODY_HEAD,
])
  .schema(updateIssueStatusSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { user } = ctx;
    const issue = await prisma.issue.findUniqueOrThrow({ where: { id: parsedInput.issueId } });

    const allowed = ALLOWED_TRANSITIONS[issue.status] ?? [];
    if (!allowed.includes(parsedInput.status)) {
      throw new Error(`Cannot transition from ${issue.status} to ${parsedInput.status}`);
    }

    const [updated] = await prisma.$transaction([
      prisma.issue.update({
        where: { id: parsedInput.issueId },
        data: {
          status: parsedInput.status,
          updatedAt: new Date(),
          ...(parsedInput.status === IssueStatus.VERIFIED && !issue.verifiedAt
            ? { verifiedAt: new Date() }
            : {}),
          ...(parsedInput.status === IssueStatus.RESOLVED
            ? { resolvedAt: new Date() }
            : {}),
        },
      }),
      prisma.issueUpdate.create({
        data: {
          issueId: parsedInput.issueId,
          authorId: user.id,
          content: parsedInput.comment ?? `Status changed to ${parsedInput.status}`,
          images: parsedInput.images,
          statusChange: parsedInput.status,
        },
      }),
    ]);

    return { issue: updated };
  });

export const assignIssueAction = roleActionClient([
  Role.LOCAL_BODY_HEAD,
  Role.LOCAL_BODY_EMPLOYEE,
])
  .schema(assignIssueSchema)
  .action(async ({ parsedInput, ctx }) => {
    const actor = await prisma.user.findUniqueOrThrow({
      where: { id: String(ctx.user.id) },
      select: {
        role: true,
        municipalityName: true,
        department: true,
        isSectionHead: true,
      },
    });

    const issue = await prisma.issue.findUniqueOrThrow({
      where: { id: parsedInput.issueId },
    });

    if (issue.status !== IssueStatus.VERIFIED) {
      throw new Error("Issue must be VERIFIED before it can be assigned");
    }
    if (
      actor.municipalityName &&
      issue.municipalityName !== actor.municipalityName
    ) {
      throw new Error("That issue is not in your municipality.");
    }

    const assignee = await prisma.user.findUnique({
      where: { id: parsedInput.assignedToId },
      select: {
        role: true,
        municipalityName: true,
        department: true,
        isActive: true,
      },
    });
    if (
      !assignee ||
      assignee.role !== Role.LOCAL_BODY_EMPLOYEE ||
      !assignee.isActive ||
      assignee.municipalityName !== issue.municipalityName
    ) {
      throw new Error("Pick an active officer in this municipality.");
    }

    // Section heads may only assign issues that belong to their own section, and
    // only to officers within that section. The municipal HEAD can override and
    // assign any issue to anyone in the municipality.
    if (actor.role === Role.LOCAL_BODY_EMPLOYEE) {
      const issueSection = categoryToDepartment(issue.category);
      if (!actor.isSectionHead || actor.department !== issueSection) {
        throw new Error("You can only assign issues for your own section.");
      }
      if (assignee.department !== actor.department) {
        throw new Error("Assign to an officer in your section.");
      }
    }

    const [updated] = await prisma.$transaction([
      prisma.issue.update({
        where: { id: parsedInput.issueId },
        data: {
          status: IssueStatus.ASSIGNED,
          assignedToId: parsedInput.assignedToId,
          assignedAt: new Date(),
          dueDate: parsedInput.dueDate ? new Date(parsedInput.dueDate) : undefined,
        },
      }),
      prisma.issueUpdate.create({
        data: {
          issueId: parsedInput.issueId,
          authorId: String(ctx.user.id),
          content: parsedInput.comment ?? "Issue assigned",
          images: [],
          statusChange: IssueStatus.ASSIGNED,
        },
      }),
    ]);

    return { issue: updated };
  });

export const createRootIssueAction = roleActionClient([Role.LOCAL_BODY_HEAD])
  .schema(createRootIssueSchema)
  .action(async ({ parsedInput }) => {
    const rootIssue = await prisma.$transaction(async (tx) => {
      const root = await tx.rootIssue.create({
        data: {
          title: parsedInput.title,
          description: parsedInput.description,
          category: parsedInput.category,
          municipalityName: parsedInput.municipalityName,
          districtName: parsedInput.districtName,
          provinceName: parsedInput.provinceName,
        },
      });

      await tx.issue.updateMany({
        where: { id: { in: parsedInput.issueIds } },
        data: {
          rootIssueId: root.id,
          aiRootCauseSuggestion: null,
          aiRootCauseReason: null,
          aiRootCauseConfidence: null,
        },
      });

      return root;
    });

    return { rootIssue };
  });

export const setIssueDueDateAction = roleActionClient([Role.LOCAL_BODY_HEAD])
  .schema(z.object({ issueId: z.string(), dueDate: z.string() }))
  .action(async ({ parsedInput }) => {
    const issue = await prisma.issue.update({
      where: { id: parsedInput.issueId },
      data: { dueDate: new Date(parsedInput.dueDate) },
    });
    return { issue };
  });

// STORY-010: HEAD confirms a coordinated fix — resolve open downstream issues
// that descend from a fixed upstream root. These RESOLVED issues remain
// disputable by the community (RESOLVED → REOPENED), so a wrong cascade self-corrects.
export const cascadeResolveAction = roleActionClient([Role.LOCAL_BODY_HEAD])
  .schema(
    z.object({
      upstreamIssueId: z.string().min(1),
      downstreamIssueIds: z.array(z.string().min(1)).min(1),
    })
  )
  .action(async ({ parsedInput, ctx }) => {
    const head = await prisma.user.findUniqueOrThrow({
      where: { id: String(ctx.user.id) },
      select: { municipalityName: true },
    });

    // Keep only ids genuinely linked downstream of this upstream issue.
    const links = await prisma.issueChainLink.findMany({
      where: {
        upstreamIssueId: parsedInput.upstreamIssueId,
        downstreamIssueId: { in: parsedInput.downstreamIssueIds },
      },
      select: { downstreamIssueId: true },
    });
    const linkedIds = links.map((l) => l.downstreamIssueId);
    if (linkedIds.length === 0) return { resolved: 0 };

    // Scope to the head's municipality and only still-open issues.
    const targets = await prisma.issue.findMany({
      where: {
        id: { in: linkedIds },
        municipalityName: head.municipalityName ?? undefined,
        status: { not: IssueStatus.RESOLVED },
      },
      select: { id: true },
    });
    const targetIds = targets.map((t) => t.id);
    if (targetIds.length === 0) return { resolved: 0 };

    const now = new Date();
    await prisma.$transaction([
      prisma.issue.updateMany({
        where: { id: { in: targetIds } },
        data: { status: IssueStatus.RESOLVED, resolvedAt: now, updatedAt: now },
      }),
      prisma.issueUpdate.createMany({
        data: targetIds.map((id) => ({
          issueId: id,
          authorId: String(ctx.user.id),
          content:
            "Resolved as part of a coordinated fix of the upstream root cause. Dispute if the problem persists.",
          images: [],
          statusChange: IssueStatus.RESOLVED,
        })),
      }),
    ]);

    return { resolved: targetIds.length };
  });

// STORY-015: HEAD overrides a wrong AI/rule cascade link. Removes the directed
// link into this downstream issue and detaches it from the chain.
export const removeCascadeLinkAction = roleActionClient([Role.LOCAL_BODY_HEAD])
  .schema(z.object({ downstreamIssueId: z.string().min(1) }))
  .action(async ({ parsedInput, ctx }) => {
    const head = await prisma.user.findUniqueOrThrow({
      where: { id: String(ctx.user.id) },
      select: { municipalityName: true },
    });

    const issue = await prisma.issue.findUniqueOrThrow({
      where: { id: parsedInput.downstreamIssueId },
      select: { municipalityName: true },
    });
    if (head.municipalityName && issue.municipalityName !== head.municipalityName) {
      throw new Error("That issue is not in your municipality.");
    }

    await prisma.$transaction([
      prisma.issueChainLink.deleteMany({
        where: { downstreamIssueId: parsedInput.downstreamIssueId },
      }),
      prisma.issue.update({
        where: { id: parsedInput.downstreamIssueId },
        data: { chainRootIssueId: null },
      }),
    ]);

    return { removed: true };
  });
