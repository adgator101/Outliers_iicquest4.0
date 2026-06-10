import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { Category, Prisma, Role, RootIssueStatus } from "@/generated/prisma/client";

const VALID_CATEGORY = new Set<string>(Object.values(Category));
const VALID_STATUS = new Set<string>(Object.values(RootIssueStatus));

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const user = await getCurrentUser();

  const where: Prisma.RootIssueWhereInput = {};

  if (sp.get("municipality")) where.municipalityName = sp.get("municipality");
  if (sp.get("district")) where.districtName = sp.get("district");
  if (sp.get("province")) where.provinceName = sp.get("province");

  const category = sp.get("category");
  if (category && VALID_CATEGORY.has(category)) where.category = category as Category;

  const status = sp.get("status");
  if (status && VALID_STATUS.has(status)) where.status = status as RootIssueStatus;

  // Local body roles only see root issues in their municipality.
  if (
    user &&
    (user.role === Role.LOCAL_BODY_EMPLOYEE || user.role === Role.LOCAL_BODY_HEAD) &&
    user.municipalityName
  ) {
    where.municipalityName = user.municipalityName;
  }

  const rootIssues = await prisma.rootIssue.findMany({
    where,
    include: { _count: { select: { issues: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ rootIssues });
}
