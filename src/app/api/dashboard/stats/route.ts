import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getDashboardStats, scopeForUser } from "@/lib/queries";

export async function GET() {
  const user = await getCurrentUser();
  const stats = await getDashboardStats(scopeForUser(user));
  return NextResponse.json({ stats });
}
