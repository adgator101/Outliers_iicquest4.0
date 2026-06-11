"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { verifyIssueAction } from "@/lib/actions/issues";
import { IssueStatus, VerificationType } from "@/generated/prisma/enums";
import type { IssueStatus as IssueStatusType } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Vote = "CONFIRM" | "DISPUTE" | null;

export function VerifyIssueButtons({
  issueId,
  initialConfirmCount,
  initialDisputeCount,
  myVerification,
  issueStatus,
}: {
  issueId: string;
  initialConfirmCount: number;
  initialDisputeCount: number;
  myVerification: Vote;
  issueStatus: IssueStatusType;
}) {
  const [vote, setVote] = useState<Vote>(myVerification);
  const [confirmCount, setConfirmCount] = useState(initialConfirmCount);
  const [disputeCount, setDisputeCount] = useState(initialDisputeCount);

  const { execute, isPending } = useAction(verifyIssueAction, {
    onSuccess: ({ data }) => {
      if (!data) return;
      setConfirmCount(data.confirmCount);
      setDisputeCount(data.disputeCount);
      toast.success("Your response was recorded.");
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Could not record your response.");
    },
  });

  const isResolution = issueStatus === IssueStatus.RESOLVED;

  function cast(type: "CONFIRM" | "DISPUTE") {
    setVote(type);
    execute({ issueId, type: VerificationType[type] });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          variant={vote === "CONFIRM" ? "default" : "outline"}
          disabled={isPending}
          onClick={() => cast("CONFIRM")}
          className={cn(vote === "CONFIRM" && "ring-2 ring-status-resolved/40")}
        >
          {isPending && vote === "CONFIRM" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ThumbsUp className="size-4" />
          )}
          {isResolution ? "Confirm resolution" : "Confirm this issue"}
          <span className="tabular-nums text-muted-foreground">({confirmCount})</span>
        </Button>
        <Button
          variant={vote === "DISPUTE" ? "default" : "outline"}
          disabled={isPending}
          onClick={() => cast("DISPUTE")}
          className={cn(vote === "DISPUTE" && "ring-2 ring-red-500/40")}
        >
          {isPending && vote === "DISPUTE" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ThumbsDown className="size-4" />
          )}
          {isResolution ? "Dispute resolution" : "Dispute this issue"}
          <span className="tabular-nums text-muted-foreground">({disputeCount})</span>
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {isResolution
          ? "If most verifiers dispute the resolution, the issue is reopened."
          : "3 confirmations required for community verification."}
      </p>
    </div>
  );
}
