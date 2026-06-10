"use client";

import { useAction } from "next-safe-action/hooks";
import { updateIssueStatusAction } from "@/lib/actions/issues";
import { Button } from "@/components/ui/button";

export function VerifyButton({ issueId }: { issueId: string }) {
  const { execute, isPending } = useAction(updateIssueStatusAction, {
    onSuccess: () => window.location.reload(),
  });

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={() =>
        execute({ issueId, status: "VERIFIED", comment: "Manually verified" })
      }
    >
      {isPending ? "Verifying…" : "Verify"}
    </Button>
  );
}
