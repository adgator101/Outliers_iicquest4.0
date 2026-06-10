import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const rootIssue = await prisma.rootIssue.findUnique({
    where: { id },
    include: {
      issues: {
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          category: true,
          wardNumber: true,
          municipalityName: true,
          reportCount: true,
          communityImpactScore: true,
          affectedCitizenCount: true,
          createdAt: true,
          updatedAt: true,
          dueDate: true,
        },
        orderBy: { communityImpactScore: "desc" },
      },
    },
  });

  if (!rootIssue) {
    return NextResponse.json({ error: "Root issue not found" }, { status: 404 });
  }

  return NextResponse.json({ rootIssue });
}
