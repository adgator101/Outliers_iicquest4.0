"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { assignIssueAction } from "@/lib/actions/issues";
import { DEPARTMENT_LABELS } from "@/lib/departments";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Category, Department } from "@/generated/prisma/client";

type Employee = {
  id: string;
  name: string;
  email: string;
  department: Department | null;
  wardNumber: number | null;
  openIssueCount: number;
  isRecommended: boolean;
};

function detail(e: Employee) {
  const ward = e.wardNumber != null ? `Ward ${e.wardNumber}` : "Municipality-wide";
  const load = `${e.openIssueCount} open`;
  return `${ward} · ${load}`;
}

export function AssignIssueDialog({
  issueId,
  issueTitle,
  issueCategory,
}: {
  issueId: string;
  issueTitle: string;
  issueCategory: Category;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [recommendedDepartment, setRecommendedDepartment] =
    useState<Department | null>(null);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [assignedToId, setAssignedToId] = useState<string>("");
  const [dueDate, setDueDate] = useState("");
  const [comment, setComment] = useState("");

  const { execute, isPending } = useAction(assignIssueAction, {
    onSuccess: () => {
      toast.success("Issue assigned.");
      setOpen(false);
      router.refresh();
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Could not assign the issue.");
    },
  });

  async function onOpenChange(next: boolean) {
    setOpen(next);
    if (next && employees.length === 0) {
      setLoadingEmployees(true);
      try {
        const res = await fetch(
          `/api/authority/employees?category=${issueCategory}`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error("Failed to load employees");
        const data = (await res.json()) as {
          employees: Employee[];
          recommendedDepartment: Department | null;
        };
        setEmployees(data.employees);
        setRecommendedDepartment(data.recommendedDepartment);
      } catch {
        toast.error("Could not load officers.");
      } finally {
        setLoadingEmployees(false);
      }
    }
  }

  function submit() {
    if (!assignedToId) {
      toast.error("Select an officer to assign.");
      return;
    }
    execute({
      issueId,
      assignedToId,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      comment: comment || undefined,
    });
  }

  const recommended = employees.filter((e) => e.isRecommended);
  const others = employees.filter((e) => !e.isRecommended);
  // Trigger shows just the officer's name for the selected id.
  const employeeItems = Object.fromEntries(employees.map((e) => [e.id, e.name]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <UserPlus className="size-4" />
            Assign
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign issue</DialogTitle>
          <DialogDescription className="line-clamp-2">{issueTitle}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Officer</Label>
            {loadingEmployees ? (
              <p className="text-sm text-muted-foreground">Loading officers…</p>
            ) : employees.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active officers in your municipality. Add staff on the Team page.
              </p>
            ) : (
              <Select
                items={employeeItems}
                value={assignedToId}
                onValueChange={(v) => setAssignedToId(String(v ?? ""))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an officer" />
                </SelectTrigger>
                <SelectContent>
                  {recommended.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>
                        Recommended
                        {recommendedDepartment
                          ? ` — ${DEPARTMENT_LABELS[recommendedDepartment]}`
                          : ""}
                      </SelectLabel>
                      {recommended.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name}
                          <span className="text-xs text-muted-foreground">
                            {detail(e)}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  {others.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>
                        {recommended.length > 0 ? "Other staff" : "All staff"}
                      </SelectLabel>
                      {others.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name}
                          <span className="text-xs text-muted-foreground">
                            {detail(e)}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
            )}
            <p className="text-xs text-muted-foreground">
              Officers in the matching section are suggested first. Open counts are
              shown for context — you decide who takes it.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dueDate">Commitment date (optional)</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="assignComment">Note (optional)</Label>
            <Textarea
              id="assignComment"
              rows={3}
              maxLength={500}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Instructions for the assigned officer."
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            disabled={isPending}
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button disabled={isPending || !assignedToId} onClick={submit}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
