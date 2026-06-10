import { requireRole } from "@/lib/session";
import { Role } from "@/generated/prisma/client";
import { TopNav } from "@/components/layout/top-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, BarChart3, MapPin } from "lucide-react";

export default async function ExecutiveDashboardPage() {
  await requireRole([Role.EXECUTIVE_BODY]);

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">National Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Read-only transparency dashboard — all municipalities, all provinces.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="size-4" />
                National Heatmap
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                All active issues mapped across Nepal.
              </p>
              <Badge variant="outline" className="text-xs">Coming in next build</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="size-4" />
                System Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                Issues by status, category, province — system-wide.
              </p>
              <Badge variant="outline" className="text-xs">Coming in next build</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="size-4" />
                Root Cause Clusters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                Systemic issues grouped nationally.
              </p>
              <Badge variant="outline" className="text-xs">Coming in next build</Badge>
            </CardContent>
          </Card>
        </div>

        <Card className="border-dashed">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              Full executive dashboard — national heatmap (Mapbox), transparency metrics, province/district filters, and root cause clustering — is being built in the next increment.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
