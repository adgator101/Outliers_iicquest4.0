import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Health checks must always reflect live state — never serve a cached response.
export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();

  let database: "up" | "down" = "down";
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = "up";
  } catch {
    database = "down";
  }

  const healthy = database === "up";

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      responseTimeMs: Date.now() - startedAt,
      checks: {
        database,
      },
    },
    {
      status: healthy ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
