import { requireRole } from "@/lib/session";
import { Role, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getDashboardStats } from "@/lib/queries";
import { categoryLabel, cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
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
    {
      label: "Total Issues",
      value: stats.total,
      icon: Globe,
      accent: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
    },
    {
      label: "Open",
      value: stats.open,
      icon: FolderOpen,
      accent: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    },
    {
      label: "Needs Attention",
      value: stats.attentionCount,
      icon: AlertTriangle,
      accent: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
      highlight: stats.attentionCount > 0,
    },
    {
      label: "Resolved",
      value: stats.byStatus.RESOLVED,
      icon: CheckCircle2,
      accent: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b pb-5">
        <h1 className="text-2xl font-semibold tracking-tight">National Overview</h1>
        <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          <Globe className="size-4 shrink-0" />
          Read-only transparency dashboard — all municipalities, all provinces
        </p>
      </div>

      {/* Stats strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card
            key={s.label}
            className={cn(s.highlight && "border-red-200 dark:border-red-900/60")}
          >
            <CardContent className="flex items-center justify-between gap-3 pt-6">
              <div className="min-w-0">
                <p className="truncate text-sm text-muted-foreground">{s.label}</p>
                <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums">
                  {s.value}
                </p>
              </div>
              <div
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-lg",
                  s.accent
                )}
              >
                <s.icon className="size-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* National heatmap */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="size-5 text-primary" />
          <h2 className="text-lg font-semibold tracking-tight">National Heatmap</h2>
        </div>
        <NationalHeatmap issues={issues as HeatmapIssue[]} />
      </section>

      {/* National issue table */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">All Issues</h2>
        <NationalIssuesTable initialIssues={issues as NationalIssueRow[]} />
      </section>

      {/* Root cause clusters */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <LayersIcon className="size-5 text-violet-600" />
          <h2 className="text-lg font-semibold tracking-tight">Root Cause Clusters</h2>
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
