import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getAttentionIssues, scopeForUser } from "@/lib/queries";

export async function GET() {
  const user = await getCurrentUser();
  const attention = await getAttentionIssues(scopeForUser(user));
  return NextResponse.json({ attention });
}
