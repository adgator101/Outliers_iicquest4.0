"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { GitBranch, Sparkles, Cog, Loader2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { removeCascadeLinkAction } from "@/lib/actions/issues";
import { Button } from "@/components/ui/button";

function band(confidence: number): string {
  return confidence >= 0.85 ? "Strong link" : confidence >= 0.65 ? "Likely link" : "Possible link";
}

// Shows why an issue was cascaded (provenance + reasoning) and lets the HEAD undo
// a wrong link. AI suggestions stay human-reversible.
export function CascadeLinkBanner({
  upstream,
  reason,
  source,
  confidence,
  downstreamIssueId,
  canRemove,
  hrefBase,
}: {
  upstream: { id: string; title: string };
  reason: string | null;
  source: string;
  confidence: number;
  downstreamIssueId: string;
  canRemove: boolean;
  hrefBase: string;
}) {
  const router = useRouter();
  const [removed, setRemoved] = useState(false);

  const { execute, isPending } = useAction(removeCascadeLinkAction, {
    onSuccess: () => {
      toast.success("Link removed — issue detached from the chain.");
      setRemoved(true);
      router.refresh();
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Could not remove the link.");
    },
  });

  if (removed) return null;

  return (
    <div className="space-y-2 rounded-xl bg-amber-50 p-4 text-sm ring-1 ring-amber-200/70 dark:bg-amber-950/30 dark:ring-amber-900/50">
      <div className="flex items-start gap-2">
        <GitBranch className="mt-0.5 size-4 shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <p>
            May be caused by:{" "}
            <Link
              href={`${hrefBase}/${upstream.id}`}
              className="font-medium underline underline-offset-4"
            >
              {upstream.title}
            </Link>
          </p>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
              {source === "ai" ? (
                <>
                  <Sparkles className="size-3 text-violet-600" /> AI-detected
                </>
              ) : (
                <>
                  <Cog className="size-3" /> Auto-linked
                </>
              )}
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {band(confidence)}
            </span>
          </div>

          {reason && <p className="text-xs text-muted-foreground">{reason}</p>}

          {canRemove && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              disabled={isPending}
              onClick={() => execute({ downstreamIssueId })}
            >
              {isPending && <Loader2 className="size-3.5 animate-spin" />}
              Not related — remove link
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
