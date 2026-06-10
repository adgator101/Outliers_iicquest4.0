import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getEscalatedIssues, scopeForUser } from "@/lib/queries";

export async function GET() {
  const user = await getCurrentUser();
  const escalations = await getEscalatedIssues(scopeForUser(user));
  return NextResponse.json({ escalations });
}
