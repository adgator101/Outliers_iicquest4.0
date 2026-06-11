"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Check, X } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { respondToAssignmentAction } from "@/lib/actions/issues";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Shown to the officer a VERIFIED issue was requested to. Accept requires a
// "Completing by" date (the officer's own commitment); Decline optionally takes
// a reason and sends it back to the section head (STORY-017).
export function AssignmentRequestActions({
  issueId,
  issueTitle,
}: {
  issueId: string;
  issueTitle: string;
}) {
  const router = useRouter();
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [completionDate, setCompletionDate] = useState("");
  const [note, setNote] = useState("");
  // Minimum selectable date = tomorrow (computed once, lazily — not during render).
  const [minDate] = useState(
    () => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
  );

  const { execute, isPending } = useAction(respondToAssignmentAction, {
    onSuccess: ({ data }) => {
      toast.success(
        data?.decision === "ACCEPT" ? "Accepted. The issue is now yours." : "Request declined."
      );
      setAcceptOpen(false);
      setDeclineOpen(false);
      router.refresh();
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Could not submit your response.");
    },
  });

  function accept() {
    if (!completionDate) {
      toast.error("Pick a completion date.");
      return;
    }
    execute({
      issueId,
      decision: "ACCEPT",
      completionDate: new Date(completionDate).toISOString(),
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Accept */}
      <Dialog open={acceptOpen} onOpenChange={setAcceptOpen}>
        <DialogTrigger
          render={
            <Button size="sm">
              <Check className="size-4" />
              Accept
            </Button>
          }
        />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept this assignment</DialogTitle>
            <DialogDescription className="line-clamp-2">{issueTitle}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="completionDate">Completing by</Label>
            <Input
              id="completionDate"
              type="date"
              min={minDate}
              value={completionDate}
              onChange={(e) => setCompletionDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Your commitment to the community. Shown publicly and tracked factually.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={isPending} onClick={() => setAcceptOpen(false)}>
              Cancel
            </Button>
            <Button disabled={isPending || !completionDate} onClick={accept}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Accept & commit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline */}
      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogTrigger
          render={
            <Button size="sm" variant="outline">
              <X className="size-4" />
              Decline
            </Button>
          }
        />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline this request</DialogTitle>
            <DialogDescription className="line-clamp-2">{issueTitle}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="declineNote">Reason (optional)</Label>
            <Textarea
              id="declineNote"
              rows={3}
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why you can't take this — sent back to your section head."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={isPending} onClick={() => setDeclineOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={isPending}
              onClick={() => execute({ issueId, decision: "DECLINE", note: note || undefined })}
            >
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
