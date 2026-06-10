import { requireRole } from "@/lib/session";
import { Role } from "@/generated/prisma/client";
import { TopNav } from "@/components/layout/top-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, ClipboardList, Users, AlertTriangle } from "lucide-react";

export default async function AuthorityDashboardPage() {
  const user = await requireRole([Role.LOCAL_BODY_EMPLOYEE, Role.LOCAL_BODY_HEAD]);

  const isHead = user.role === Role.LOCAL_BODY_HEAD;

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {isHead ? "Municipality Dashboard" : "My Assigned Issues"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isHead
              ? `Managing ${user.municipalityName ?? "your municipality"}`
              : `Logged in as ${user.name} · ${user.municipalityName ?? "municipality"}`}
          </p>
        </div>

        {user.municipalityName && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="size-4 shrink-0" />
            <span>
              {[user.municipalityName, user.districtName, user.provinceName]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="size-4" />
                {isHead ? "All Issues" : "Assigned to Me"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="outline" className="text-xs">Coming in next build</Badge>
            </CardContent>
          </Card>

          {isHead && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="size-4" />
                  Root Cause Review
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">
                  AI-suggested root causes pending your review.
                </p>
                <Badge variant="outline" className="text-xs">Coming in next build</Badge>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="size-4" />
                Escalations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="outline" className="text-xs">Coming in next build</Badge>
            </CardContent>
          </Card>
        </div>

        <Card className="border-dashed">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              Full authority dashboard — issue assignment, root cause review, escalation queue, and municipality metrics — is being built in the next increment.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
