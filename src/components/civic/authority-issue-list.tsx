"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IssueCard, type IssueCardData } from "./issue-card";
import { AssignIssueDialog } from "./assign-issue-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const STATUS_TABS: { value: string; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "VERIFIED", label: "Verified" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "RESOLVED", label: "Resolved" },
];

export function AuthorityIssueList({
  initialIssues,
  userId,
  isEmployee = false,
  isHead = false,
}: {
  initialIssues: IssueCardData[];
  userId: string;
  municipalityName: string | null;
  isEmployee?: boolean;
  isHead?: boolean;
}) {
  const [status, setStatus] = useState<string>("ALL");
  const [issues, setIssues] = useState<IssueCardData[]>(initialIssues);
  const [isLoading, setIsLoading] = useState(false);

  const fetchIssues = useCallback(
    async (nextStatus: string) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ limit: "50" });
        if (nextStatus !== "ALL") params.set("status", nextStatus);
        if (isEmployee) params.set("assignedTo", userId);

        const res = await fetch(`/api/issues?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load issues");
        const data = (await res.json()) as { issues: IssueCardData[] };
        setIssues(data.issues);
      } catch {
        setIssues([]);
      } finally {
        setIsLoading(false);
      }
    },
    [isEmployee, userId]
  );

  // Skip the very first run — we already have initialIssues from the server.
  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    fetchIssues(status);
  }, [status, fetchIssues]);

  return (
    <div className="space-y-4">
      <Tabs value={status} onValueChange={(v) => setStatus(String(v))}>
        <TabsList className="flex-wrap">
          {STATUS_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading issues…</p>
      ) : issues.length === 0 ? (
        <p className="text-sm text-muted-foreground">No issues found.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {issues.map((issue) => (
            <div key={issue.id} className="space-y-2">
              <IssueCard issue={issue} href={`/authority/issues/${issue.id}`} />
              {isHead && issue.status === "VERIFIED" && (
                <div className="flex justify-end">
                  <AssignIssueDialog
                    issueId={issue.id}
                    issueTitle={issue.title}
                    issueCategory={issue.category}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
