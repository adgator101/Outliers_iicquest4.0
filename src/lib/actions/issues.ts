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

export const verifyIssueAction = authActionClient
  .schema(verifyIssueSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { user } = ctx;

    // Upsert verification (one per user per issue)
    const verification = await prisma.issueVerification.upsert({
      where: { issueId_userId: { issueId: parsedInput.issueId, userId: user.id } },
      create: {
        issueId: parsedInput.issueId,
        userId: user.id,
        type: parsedInput.type,
      },
      update: { type: parsedInput.type },
    });

    // Recompute counts
    const [confirmCount, disputeCount] = await Promise.all([
      prisma.issueVerification.count({ where: { issueId: parsedInput.issueId, type: "CONFIRM" } }),
      prisma.issueVerification.count({ where: { issueId: parsedInput.issueId, type: "DISPUTE" } }),
    ]);

    const issue = await prisma.issue.findUniqueOrThrow({
      where: { id: parsedInput.issueId },
      select: { status: true },
    });

    let newStatus = issue.status;

    // Auto-verify if 3+ confirmations and still SUBMITTED
    if (confirmCount >= 3 && issue.status === IssueStatus.SUBMITTED) {
      newStatus = IssueStatus.VERIFIED;
    }

    // Auto-reopen if dispute majority and RESOLVED
    if (
      issue.status === IssueStatus.RESOLVED &&
      disputeCount > confirmCount
    ) {
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

    return { verification, confirmCount, disputeCount, newStatus };
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
