"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Map as MapIcon, List as ListIcon } from "lucide-react";
import { IssueCard, type IssueCardData } from "./issue-card";
import { CitizenIssueMap } from "./citizen-issue-map";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const STATUS_TABS: { value: string; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "VERIFIED", label: "Verified" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "RESOLVED", label: "Resolved" },
];

export function WardIssuesFeed({
  initialIssues,
  ward,
  municipality,
}: {
  initialIssues: IssueCardData[];
  ward: number | null;
  municipality: string | null;
}) {
  const [status, setStatus] = useState<string>("ALL");
  const [view, setView] = useState<"list" | "map">("list");
  const [issues, setIssues] = useState<IssueCardData[]>(initialIssues);
  const [isLoading, setIsLoading] = useState(false);

  const fetchIssues = useCallback(
    async (nextStatus: string) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ limit: "30" });
        if (nextStatus !== "ALL") params.set("status", nextStatus);
        if (ward != null) params.set("ward", String(ward));
        if (municipality) params.set("municipality", municipality);

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
    [ward, municipality]
  );

  // Skip the first run — we already have initialIssues from the server.
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
      {/* List / Map view toggle */}
      <div className="flex gap-1.5">
        <Button
          size="sm"
          variant={view === "list" ? "default" : "outline"}
          onClick={() => setView("list")}
        >
          <ListIcon className="size-4" />
          List
        </Button>
        <Button
          size="sm"
          variant={view === "map" ? "default" : "outline"}
          onClick={() => setView("map")}
        >
          <MapIcon className="size-4" />
          Map
        </Button>
      </div>

      {view === "map" ? (
        <CitizenIssueMap ward={ward} municipality={municipality} />
      ) : (
        <>
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
            <p className="text-sm text-muted-foreground">
              No issues found in your ward.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {issues.map((issue) => (
                <IssueCard key={issue.id} issue={issue} href={`/issues/${issue.id}`} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
