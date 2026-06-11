"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { createRootIssueAction } from "@/lib/actions/issues";
import { categoryLabel, cn } from "@/lib/utils";
import type { Category } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type CardState = "idle" | "editing" | "dismissed" | "done";

export type RootCauseSuggestionCardProps = {
  issueId: string;
  suggestion: string;
  reason: string;
  confidence: number;
  relatedIds: string[];
  category: Category;
  municipalityName: string | null;
  districtName: string | null;
  provinceName: string | null;
};

const MAX_VISIBLE_RELATED = 5;

export function RootCauseSuggestionCard({
  issueId,
  suggestion,
  reason,
  confidence,
  relatedIds,
  category,
  municipalityName,
  districtName,
  provinceName,
}: RootCauseSuggestionCardProps) {
  const [state, setState] = useState<CardState>("idle");
  const [title, setTitle] = useState(suggestion);
  const [description, setDescription] = useState(reason);

  const { execute, isPending } = useAction(createRootIssueAction, {
    onSuccess: () => {
      toast.success("Root issue created.");
      setState("done");
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Could not create the root issue.");
    },
  });

  // The suggestion-bearing issue plus its AI-related issues form the cluster.
  const issueIds = Array.from(new Set([issueId, ...relatedIds]));
  // Qualitative band rather than a fabricated-looking percentage.
  const patternStrength =
    confidence >= 0.85 ? "Strong pattern" : confidence >= 0.65 ? "Likely pattern" : "Possible pattern";

  function create(useTitle: string, useDescription: string) {
    execute({
      title: useTitle,
      description: useDescription,
      category,
      issueIds,
      municipalityName: municipalityName ?? undefined,
      districtName: districtName ?? undefined,
      provinceName: provinceName ?? undefined,
    });
  }

  if (state === "dismissed") return null;

  if (state === "done") {
    return (
      <Card className="border-l-4 border-status-resolved bg-status-resolved/5">
        <CardContent className="flex items-center gap-2 py-4 text-sm font-medium text-status-resolved">
          <CheckCircle2 className="size-4 shrink-0" />
          Root issue created — {title}
        </CardContent>
      </Card>
    );
  }

  const visibleRelated = relatedIds.slice(0, MAX_VISIBLE_RELATED);
  const hiddenCount = relatedIds.length - visibleRelated.length;

  return (
    <Card className="border-l-4 border-simrik">
      <CardContent className="space-y-3 pt-6">
        {/* Top row: pattern strength + category */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="gap-1 border-transparent bg-simrik/10 text-simrik">
            <Sparkles className="size-3" />
            {patternStrength}
          </Badge>
          <Badge variant="secondary">{categoryLabel(category)}</Badge>
        </div>

        {state === "editing" ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={`title-${issueId}`}>Root issue title</Label>
              <Input
                id={`title-${issueId}`}
                value={title}
                minLength={5}
                maxLength={120}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`desc-${issueId}`}>Description</Label>
              <Textarea
                id={`desc-${issueId}`}
                value={description}
                rows={4}
                minLength={10}
                maxLength={1000}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={isPending}
                onClick={() => create(title, description)}
              >
                {isPending && <Loader2 className="size-4 animate-spin" />}
                Create
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={isPending}
                onClick={() => {
                  setTitle(suggestion);
                  setDescription(reason);
                  setState("idle");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <h3 className="text-base font-semibold leading-snug">{suggestion}</h3>
            <p className="text-sm text-muted-foreground">{reason}</p>

            {relatedIds.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Related issues
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {visibleRelated.map((id) => (
                    <Link
                      key={id}
                      href={`/authority/issues/${id}`}
                      className={cn(
                        "rounded border bg-muted/40 px-1.5 py-0.5 font-mono text-xs",
                        "transition-colors hover:bg-muted"
                      )}
                    >
                      {id.slice(0, 8)}
                    </Link>
                  ))}
                  {hiddenCount > 0 && (
                    <span className="text-xs text-muted-foreground">
                      + {hiddenCount} more
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                size="sm"
                disabled={isPending}
                onClick={() => create(suggestion, reason)}
              >
                {isPending && <Loader2 className="size-4 animate-spin" />}
                Accept &amp; Create
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() => setState("editing")}
              >
                Edit &amp; Create
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={isPending}
                onClick={() => setState("dismissed")}
              >
                Dismiss
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
