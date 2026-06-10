import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { Role } from "@/generated/prisma/client";

// Returns LOCAL_BODY_EMPLOYEE users within the requesting head's municipality,
// for the assignment dropdown. HEAD only.
export async function GET() {
  const user = await requireRole([Role.LOCAL_BODY_HEAD]);

  const employees = await prisma.user.findMany({
    where: {
      role: Role.LOCAL_BODY_EMPLOYEE,
      municipalityName: user.municipalityName ?? undefined,
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ employees });
}
