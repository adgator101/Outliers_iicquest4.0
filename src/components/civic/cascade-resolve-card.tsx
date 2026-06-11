"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, GitBranch } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { cascadeResolveAction } from "@/lib/actions/issues";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Downstream = { id: string; title: string };

// Shown on a RESOLVED upstream issue that still has open downstream effects.
// The HEAD confirms a coordinated fix; resolved downstream issues stay disputable.
export function CascadeResolveCard({
  upstreamIssueId,
  downstream,
}: {
  upstreamIssueId: string;
  downstream: Downstream[];
}) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  const { execute, isPending } = useAction(cascadeResolveAction, {
    onSuccess: ({ data }) => {
      toast.success(`Resolved ${data?.resolved ?? 0} downstream issue(s).`);
      router.refresh();
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Could not cascade-resolve.");
    },
  });

  if (dismissed || downstream.length === 0) return null;

  return (
    <Card className="space-y-3 border-l-4 border-status-resolved p-4">
      <div className="flex items-center gap-2">
        <GitBranch className="size-4 shrink-0 text-status-resolved" />
        <h2 className="text-sm font-semibold">Root cause fixed — resolve downstream?</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        {downstream.length} open{" "}
        {downstream.length === 1 ? "issue is" : "issues are"} linked downstream of this one.
        If the same deployment fixed them, mark them resolved. Citizens can still dispute.
      </p>
      <ul className="space-y-1 text-sm">
        {downstream.map((d) => (
          <li key={d.id} className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-status-resolved" />
            <span className="truncate">{d.title}</span>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={isPending}
          onClick={() =>
            execute({
              upstreamIssueId,
              downstreamIssueIds: downstream.map((d) => d.id),
            })
          }
        >
          {isPending && <Loader2 className="size-4 animate-spin" />}
          Mark {downstream.length} resolved
        </Button>
        <Button size="sm" variant="ghost" disabled={isPending} onClick={() => setDismissed(true)}>
          Not now
        </Button>
      </div>
    </Card>
  );
}
