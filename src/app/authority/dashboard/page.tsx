import { requireRole } from "@/lib/session";
import { Role } from "@/generated/prisma/client";
import { getDashboardStats, scopeForUser } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, AlertTriangle } from "lucide-react";

export default async function AuthorityDashboardPage() {
  const user = await requireRole([Role.LOCAL_BODY_EMPLOYEE, Role.LOCAL_BODY_HEAD]);

  const isHead = user.role === Role.LOCAL_BODY_HEAD;
  const stats = await getDashboardStats(scopeForUser(user));

  const statCards = [
    { label: "Open issues", value: stats.open },
    { label: "Pending verification", value: stats.byStatus.SUBMITTED },
    { label: "Escalated", value: stats.escalatedCount },
    { label: "Resolved", value: stats.byStatus.RESOLVED },
  ];

  return (
    <div className="space-y-6">
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-3xl font-bold tracking-tight">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="size-4" />
              Verification Queue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Coming in story 002</p>
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
              <p className="text-sm text-muted-foreground">Coming in story 003</p>
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
            <p className="text-sm text-muted-foreground">Coming in story 004</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
