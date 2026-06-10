import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { Role } from "@/generated/prisma/client";

// Returns LOCAL_BODY_EMPLOYEE users within the requesting head's municipality,
// for the team roster and the assignment dropdown. HEAD only.
//
// By default only active employees are returned (the assignment pool). The team
// page passes ?includeInactive=1 to show deactivated staff as well.
export async function GET(request: Request) {
  const user = await requireRole([Role.LOCAL_BODY_HEAD]);

  const includeInactive =
    new URL(request.url).searchParams.get("includeInactive") === "1";

  const employees = await prisma.user.findMany({
    where: {
      role: Role.LOCAL_BODY_EMPLOYEE,
      municipalityName: user.municipalityName ?? undefined,
      ...(includeInactive ? {} : { isActive: true }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      department: true,
      isActive: true,
      wardNumber: true,
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return NextResponse.json({ employees });
}
