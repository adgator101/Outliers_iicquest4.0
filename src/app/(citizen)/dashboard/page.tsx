import Link from "next/link";
import { requireRole } from "@/lib/session";
import { Role } from "@/generated/prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Plus, FileText } from "lucide-react";

export default async function CitizenDashboardPage() {
  const user = await requireRole([Role.CITIZEN]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome, {user.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Citizen dashboard — report and track civic issues in your area.
        </p>
      </div>

      {(user.municipalityName || user.wardNumber) && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="size-4 shrink-0" />
          <span>
            {[user.municipalityName, user.wardNumber ? `Ward ${user.wardNumber}` : null]
              .filter(Boolean)
              .join(", ")}
          </span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="size-4" />
              Report an Issue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Spotted a civic problem? Submit a report and it will be tracked until resolved.
            </p>
            <Link
              href="/report"
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Submit a report
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="size-4" />
              Track Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              View open issues in your ward and verify their status.
            </p>
            <Badge variant="outline" className="text-xs">Coming in next build</Badge>
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            Full citizen dashboard — your reports, nearby issues, and verification history — is being built in the next increment.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
