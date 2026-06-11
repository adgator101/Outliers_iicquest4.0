"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, CalendarClock, Pencil } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { updateDueDateAction } from "@/lib/actions/issues";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function fmt(d: Date | string | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Compact date-update control shown to the assigned officer (and section head
// / HEAD). Every change writes "was X, now Y" to the timeline so citizens
// see the full history (STORY-017 / accountability rule).
export function UpdateDueDateForm({
  issueId,
  currentDueDate,
}: {
  issueId: string;
  currentDueDate: Date | string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(
    currentDueDate
      ? new Date(currentDueDate).toISOString().slice(0, 10)
      : ""
  );

  const { execute, isPending } = useAction(updateDueDateAction, {
    onSuccess: () => {
      toast.success("Completion date updated — change recorded on the timeline.");
      setEditing(false);
      router.refresh();
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Could not update the date.");
    },
  });

  function save() {
    if (!value) return;
    execute({ issueId, dueDate: new Date(value).toISOString() });
  }

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm">
          <CalendarClock className="size-4 text-muted-foreground" />
          {currentDueDate ? (
            <>
              Completing by <span className="font-medium">{fmt(currentDueDate)}</span>
            </>
          ) : (
            <span className="text-muted-foreground">No completion date set</span>
          )}
        </span>
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
          <Pencil className="size-3.5" />
          {currentDueDate ? "Change" : "Set date"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>
        {currentDueDate
          ? `Update completion date (currently ${fmt(currentDueDate)})`
          : "Set completion date"}
      </Label>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="date"
          className="w-44"
          min={new Date().toISOString().slice(0, 10)}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <Button disabled={isPending || !value} onClick={save}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          Save
        </Button>
        <Button variant="ghost" disabled={isPending} onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        The change and previous date will be recorded on the public timeline.
      </p>
    </div>
  );
}
