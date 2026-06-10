import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getRootCauseSuggestions, scopeForUser } from "@/lib/queries";

export async function GET() {
  const user = await getCurrentUser();
  const suggestions = await getRootCauseSuggestions(scopeForUser(user));
  return NextResponse.json({ suggestions });
}
