"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { roleActionClient } from "@/lib/safe-action";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Role, Department } from "@/generated/prisma/client";

const departmentEnum = z.enum(
  Object.values(Department) as [Department, ...Department[]]
);

const createEmployeeSchema = z.object({
  name: z.string().trim().min(2, "Enter the employee's full name."),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  department: departmentEnum,
  // The ward this officer is deployed to. Omit for municipality-wide staff
  // (e.g. a central engineering section that serves every ward).
  wardNumber: z.number().int().min(1).max(99).optional(),
});

// HEAD provisions a LOCAL_BODY_EMPLOYEE account. The account is created
// server-side via better-auth and then stamped with the role, section, and the
// HEAD's own jurisdiction — the form never supplies municipality/district/province,
// so an employee can't land in the wrong municipality.
//
// Note: this project does NOT use better-auth's nextCookies plugin, so calling
// auth.api.signUpEmail here does not emit a Set-Cookie and the HEAD's own session
// is left untouched.
export const createEmployeeAction = roleActionClient([Role.LOCAL_BODY_HEAD])
  .schema(createEmployeeSchema)
  .action(async ({ parsedInput, ctx }) => {
    const head = await prisma.user.findUniqueOrThrow({
      where: { id: String(ctx.user.id) },
      select: {
        municipalityName: true,
        districtName: true,
        provinceName: true,
      },
    });

    const existing = await prisma.user.findUnique({
      where: { email: parsedInput.email },
      select: { id: true },
    });
    if (existing) {
      throw new Error("An account with that email already exists.");
    }

    let newUserId: string;
    try {
      const result = await auth.api.signUpEmail({
        body: {
          name: parsedInput.name,
          email: parsedInput.email,
          password: parsedInput.password,
        },
      });
      newUserId = result.user.id;
    } catch {
      throw new Error("Could not create the account. Try a different email.");
    }

    const employee = await prisma.user.update({
      where: { id: newUserId },
      data: {
        role: Role.LOCAL_BODY_EMPLOYEE,
        department: parsedInput.department,
        isActive: true,
        wardNumber: parsedInput.wardNumber ?? null,
        municipalityName: head.municipalityName,
        districtName: head.districtName,
        provinceName: head.provinceName,
      },
      select: { id: true, name: true, email: true, department: true },
    });

    revalidatePath("/authority/team");
    return { employee };
  });

const setSectionHeadSchema = z.object({
  userId: z.string().min(1),
  isSectionHead: z.boolean(),
});

// HEAD designates (or removes) the section head for one of their employees.
// A section has exactly one head: promoting an officer demotes any current head
// of the same section in the same municipality.
export const setSectionHeadAction = roleActionClient([Role.LOCAL_BODY_HEAD])
  .schema(setSectionHeadSchema)
  .action(async ({ parsedInput, ctx }) => {
    const head = await prisma.user.findUniqueOrThrow({
      where: { id: String(ctx.user.id) },
      select: { municipalityName: true },
    });

    const target = await prisma.user.findUnique({
      where: { id: parsedInput.userId },
      select: { role: true, municipalityName: true, department: true },
    });

    if (
      !target ||
      target.role !== Role.LOCAL_BODY_EMPLOYEE ||
      target.municipalityName !== head.municipalityName
    ) {
      throw new Error("That employee is not in your municipality.");
    }
    if (parsedInput.isSectionHead && !target.department) {
      throw new Error("Assign the employee to a section before making them its head.");
    }

    await prisma.$transaction(async (tx) => {
      // Enforce one head per section: demote the current head of this section.
      if (parsedInput.isSectionHead && target.department) {
        await tx.user.updateMany({
          where: {
            role: Role.LOCAL_BODY_EMPLOYEE,
            municipalityName: head.municipalityName,
            department: target.department,
            isSectionHead: true,
          },
          data: { isSectionHead: false },
        });
      }
      await tx.user.update({
        where: { id: parsedInput.userId },
        data: { isSectionHead: parsedInput.isSectionHead },
      });
    });

    revalidatePath("/authority/team");
    return { userId: parsedInput.userId, isSectionHead: parsedInput.isSectionHead };
  });

// HEAD activates/deactivates one of their own employees. Guarded so a HEAD can
// only touch LOCAL_BODY_EMPLOYEE accounts inside their own municipality.
const setEmployeeActiveSchema = z.object({
  userId: z.string().min(1),
  isActive: z.boolean(),
});

export const setEmployeeActiveAction = roleActionClient([Role.LOCAL_BODY_HEAD])
  .schema(setEmployeeActiveSchema)
  .action(async ({ parsedInput, ctx }) => {
    const head = await prisma.user.findUniqueOrThrow({
      where: { id: String(ctx.user.id) },
      select: { municipalityName: true },
    });

    const target = await prisma.user.findUnique({
      where: { id: parsedInput.userId },
      select: { role: true, municipalityName: true },
    });

    if (
      !target ||
      target.role !== Role.LOCAL_BODY_EMPLOYEE ||
      target.municipalityName !== head.municipalityName
    ) {
      throw new Error("That employee is not in your municipality.");
    }

    const employee = await prisma.user.update({
      where: { id: parsedInput.userId },
      data: { isActive: parsedInput.isActive },
      select: { id: true, isActive: true },
    });

    revalidatePath("/authority/team");
    return { employee };
  });
