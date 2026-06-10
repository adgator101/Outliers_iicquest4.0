"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, CalendarClock } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { setIssueDueDateAction } from "@/lib/actions/issues";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function toDateInputValue(date: Date | null): string {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

export function DeadlineForm({
  issueId,
  currentDueDate,
}: {
  issueId: string;
  currentDueDate: Date | null;
}) {
  const router = useRouter();
  const [dueDate, setDueDate] = useState(toDateInputValue(currentDueDate));

  const { execute, isPending } = useAction(setIssueDueDateAction, {
    onSuccess: () => {
      toast.success("Deadline updated.");
      router.refresh();
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Could not set the deadline.");
    },
  });

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="space-y-1.5">
        <label htmlFor="deadline" className="text-sm font-medium">
          Deadline
        </label>
        <Input
          id="deadline"
          type="date"
          className="w-44"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>
      <Button
        variant="outline"
        disabled={isPending || !dueDate}
        onClick={() => execute({ issueId, dueDate })}
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <CalendarClock className="size-4" />
        )}
        Set deadline
      </Button>
    </div>
  );
}
