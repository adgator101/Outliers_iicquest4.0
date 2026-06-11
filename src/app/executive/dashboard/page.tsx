import { requireRole } from "@/lib/session";
import { Role, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getDashboardStats } from "@/lib/queries";
import { categoryLabel, cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Globe,
  Layers as LayersIcon,
  AlertTriangle,
  CheckCircle2,
  FolderOpen,
  MapPin,
} from "lucide-react";
import {
  NationalIssuesTable,
  type NationalIssueRow,
} from "@/components/civic/national-issues-table";
import {
  NationalHeatmap,
  type HeatmapIssue,
} from "@/components/civic/national-heatmap";

const tableSelect = {
  id: true,
  title: true,
  category: true,
  status: true,
  priority: true,
  municipalityName: true,
  affectedCitizenCount: true,
  latitude: true,
  longitude: true,
  communityImpactScore: true,
  createdAt: true,
  updatedAt: true,
  dueDate: true,
} satisfies Prisma.IssueSelect;

export default async function ExecutiveDashboardPage() {
  await requireRole([Role.EXECUTIVE_BODY]);

  const [stats, issues, rootIssues] = await Promise.all([
    getDashboardStats({}),
    prisma.issue.findMany({
      orderBy: [{ communityImpactScore: "desc" }, { createdAt: "desc" }],
      take: 50,
      select: tableSelect,
    }),
    prisma.rootIssue.findMany({
      include: { _count: { select: { issues: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const statCards = [
    { label: "Total issues", value: stats.total, icon: Globe },
    { label: "Open", value: stats.open, icon: FolderOpen },
    {
      label: "Needs attention",
      value: stats.attentionCount,
      icon: AlertTriangle,
      highlight: stats.attentionCount > 0,
    },
    { label: "Resolved", value: stats.byStatus.RESOLVED, icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-8">
      {/* Nilo chrome header band */}
      <section className="pennant-clip bg-nilo px-6 py-7 text-white sm:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/60">
            Executive body · सङ्घीय निगरानी
          </p>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white/80">
            Read-only
          </span>
        </div>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight">
          National Oversight
        </h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-white/65">
          <Globe className="size-4 shrink-0" />
          All municipalities, all provinces
        </p>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/15 pt-5 sm:grid-cols-4">
          {statCards.map((s) => (
            <div key={s.label}>
              <p
                className={cn(
                  "font-heading text-3xl font-semibold tabular-nums leading-none",
                  s.highlight && "text-[#f1a0ac]"
                )}
              >
                {s.value}
              </p>
              <p className="mt-1.5 flex items-center gap-1.5 text-xs leading-snug text-white/60">
                <s.icon className="size-3.5 shrink-0" />
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* National heatmap — the centerpiece */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="size-4 text-simrik" />
          <h2 className="font-heading text-xs font-semibold uppercase tracking-[0.14em] text-nilo">
            National Heatmap
          </h2>
        </div>
        <NationalHeatmap issues={issues as HeatmapIssue[]} />
      </section>

      {/* National issue table */}
      <section className="space-y-4">
        <h2 className="font-heading text-xs font-semibold uppercase tracking-[0.14em] text-nilo">
          All Issues
        </h2>
        <NationalIssuesTable initialIssues={issues as NationalIssueRow[]} />
      </section>

      {/* Root cause clusters */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <LayersIcon className="size-4 text-simrik" />
          <h2 className="font-heading text-xs font-semibold uppercase tracking-[0.14em] text-nilo">
            Root Cause Clusters
          </h2>
          <Badge variant="secondary">{rootIssues.length}</Badge>
        </div>
        {rootIssues.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No root cause clusters identified yet.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {rootIssues.map((root) => (
              <Card key={root.id} className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium leading-snug">{root.title}</p>
                  <Badge variant="secondary" className="shrink-0">
                    {root._count.issues} linked
                  </Badge>
                </div>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="size-3" />
                  {root.municipalityName ?? "Multiple areas"} ·{" "}
                  {categoryLabel(root.category)}
                </p>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
