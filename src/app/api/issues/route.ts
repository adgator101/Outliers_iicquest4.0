import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { haversineDistance } from "@/lib/utils";
import {
  Category,
  IssueStatus,
  Prisma,
  Role,
} from "@/generated/prisma/client";

const VALID_STATUS = new Set<string>(Object.values(IssueStatus));
const VALID_CATEGORY = new Set<string>(Object.values(Category));

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const user = await getCurrentUser();

  const where: Prisma.IssueWhereInput = {};

  const status = sp.get("status");
  if (status && VALID_STATUS.has(status)) where.status = status as IssueStatus;

  const category = sp.get("category");
  if (category && VALID_CATEGORY.has(category))
    where.category = category as Category;

  const ward = sp.get("ward");
  if (ward) where.wardNumber = Number(ward);

  // Filters from query params
  if (sp.get("municipality")) where.municipalityName = sp.get("municipality");
  if (sp.get("district")) where.districtName = sp.get("district");
  if (sp.get("province")) where.provinceName = sp.get("province");

  // Role-based scoping: local body roles are locked to their municipality.
  if (
    user &&
    (user.role === Role.LOCAL_BODY_EMPLOYEE || user.role === Role.LOCAL_BODY_HEAD) &&
    user.municipalityName
  ) {
    where.municipalityName = user.municipalityName;
  }

  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit") ?? 20)));

  // Geospatial radius filter (optional): fetch candidates then filter in JS.
  const lat = sp.get("lat");
  const lng = sp.get("lng");
  const radius = sp.get("radius");

  const select = {
    id: true,
    title: true,
    description: true,
    category: true,
    status: true,
    priority: true,
    latitude: true,
    longitude: true,
    address: true,
    wardNumber: true,
    municipalityName: true,
    districtName: true,
    provinceName: true,
    reportCount: true,
    communityImpactScore: true,
    affectedCitizenCount: true,
    confirmCount: true,
    disputeCount: true,
    rootIssueId: true,
    aiRootCauseSuggestion: true,
    aiRootCauseConfidence: true,
    dueDate: true,
    escalatedAt: true,
    createdAt: true,
    updatedAt: true,
  } satisfies Prisma.IssueSelect;

  if (lat && lng && radius) {
    const all = await prisma.issue.findMany({
      where,
      select,
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    const r = Number(radius);
    const filtered = all
      .map((i) => ({
        ...i,
        distance: haversineDistance(Number(lat), Number(lng), i.latitude, i.longitude),
      }))
      .filter((i) => i.distance <= r)
      .sort((a, b) => a.distance - b.distance);
    const start = (page - 1) * limit;
    return NextResponse.json({
      issues: filtered.slice(start, start + limit),
      total: filtered.length,
      page,
      limit,
    });
  }

  const [issues, total] = await Promise.all([
    prisma.issue.findMany({
      where,
      select,
      orderBy: [{ communityImpactScore: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.issue.count({ where }),
  ]);

  return NextResponse.json({ issues, total, page, limit });
}
