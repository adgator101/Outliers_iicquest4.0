"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Category, IssueStatus, Priority } from "@/generated/prisma/enums";
import {
  categoryLabel,
  computeEscalation,
  formatRelativeTime,
} from "@/lib/utils";
import { IssueStatusBadge } from "./issue-status-badge";
import { PriorityBadge } from "./priority-badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type NationalIssueRow = {
  id: string;
  title: string;
  category: Category;
  status: IssueStatus;
  priority: Priority;
  municipalityName: string | null;
  affectedCitizenCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  dueDate: Date | string | null;
};

const STATUS_ITEMS: Record<string, string> = {
  ALL: "All statuses",
  ...Object.fromEntries(
    Object.values(IssueStatus).map((s) => [s, s.replaceAll("_", " ")])
  ),
};
const CATEGORY_ITEMS: Record<string, string> = {
  ALL: "All categories",
  ...Object.fromEntries(Object.values(Category).map((c) => [c, categoryLabel(c)])),
};

export function NationalIssuesTable({
  initialIssues,
}: {
  initialIssues: NationalIssueRow[];
}) {
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [status, setStatus] = useState("ALL");
  const [category, setCategory] = useState("ALL");

  const [issues, setIssues] = useState<NationalIssueRow[]>(initialIssues);
  const [isLoading, setIsLoading] = useState(false);

  const fetchIssues = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (province) params.set("province", province);
      if (district) params.set("district", district);
      if (municipality) params.set("municipality", municipality);
      if (status !== "ALL") params.set("status", status);
      if (category !== "ALL") params.set("category", category);

      const res = await fetch(`/api/issues?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load issues");
      const data = (await res.json()) as { issues: NationalIssueRow[] };
      setIssues(data.issues);
    } catch {
      setIssues([]);
    } finally {
      setIsLoading(false);
    }
  }, [province, district, municipality, status, category]);

  // Debounce so text typing doesn't fire a request per keystroke.
  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    const t = setTimeout(fetchIssues, 350);
    return () => clearTimeout(t);
  }, [fetchIssues]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1.5">
          <Label htmlFor="f-province">Province</Label>
          <Input
            id="f-province"
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            placeholder="Any"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-district">District</Label>
          <Input
            id="f-district"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            placeholder="Any"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-municipality">Municipality</Label>
          <Input
            id="f-municipality"
            value={municipality}
            onChange={(e) => setMunicipality(e.target.value)}
            placeholder="Any"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select items={STATUS_ITEMS} value={status} onValueChange={(v) => setStatus(String(v))}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_ITEMS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select
            items={CATEGORY_ITEMS}
            value={category}
            onValueChange={(v) => setCategory(String(v))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CATEGORY_ITEMS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Title</th>
              <th className="px-3 py-2 font-medium">Municipality</th>
              <th className="px-3 py-2 font-medium">Category</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Priority</th>
              <th className="px-3 py-2 text-right font-medium">Citizens</th>
              <th className="px-3 py-2 font-medium">Escalation</th>
              <th className="px-3 py-2 font-medium">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                  Loading issues…
                </td>
              </tr>
            ) : issues.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                  No issues match these filters.
                </td>
              </tr>
            ) : (
              issues.map((issue) => {
                const esc = computeEscalation(
                  issue.status,
                  issue.priority,
                  new Date(issue.updatedAt),
                  issue.dueDate ? new Date(issue.dueDate) : null
                );
                return (
                  <tr key={issue.id} className="transition-colors hover:bg-muted/40">
                    <td className="max-w-xs px-3 py-2">
                      <Link
                        href={`/executive/issues/${issue.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        <span className="line-clamp-1">{issue.title}</span>
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {issue.municipalityName ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {categoryLabel(issue.category)}
                    </td>
                    <td className="px-3 py-2">
                      <IssueStatusBadge status={issue.status} />
                    </td>
                    <td className="px-3 py-2">
                      <PriorityBadge priority={issue.priority} />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {issue.affectedCitizenCount}
                    </td>
                    <td className="px-3 py-2">
                      {esc.isEscalated ? (
                        <span className="font-medium text-red-600 dark:text-red-400">
                          {Math.floor(esc.hoursOverdue / 24) >= 1
                            ? `${Math.floor(esc.hoursOverdue / 24)}d overdue`
                            : `${esc.hoursOverdue}h overdue`}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">On track</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {formatRelativeTime(new Date(issue.createdAt))}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
